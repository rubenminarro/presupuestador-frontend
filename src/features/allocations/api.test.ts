import { describe, expect, it } from 'vitest'
import {
  allocationLinesInput,
  conceptDifference,
  gridFromAllocation,
  portionApplies,
  toCents,
  visiblePortionTypes,
  type Allocation,
  type AllocationConcept,
  type AllocationLine,
  type PortionType,
} from '@/features/allocations/api'

function concept(id: number, base: string, coverable: boolean, extra = false): AllocationConcept {
  return {
    source_type: extra ? 'work_order_part' : 'work_order_item',
    source_id: id,
    budget_item_id: extra ? null : id,
    description: `Concepto ${id}`,
    is_extra: extra,
    responsibility: coverable ? { value: 'insurer', label: 'Aseguradora' } : { value: 'owner', label: 'Dueño' },
    coverable,
    quantity: '1.00',
    base_unit_price: base,
    base_total: base,
    authorized_total: coverable ? '800000.00' : null,
  }
}

function line(source: AllocationConcept, type: PortionType, amount: string, exception: number | null = null): AllocationLine {
  return {
    id: Math.random(),
    portion_type: { value: type, label: type },
    source: { type: source.source_type, id: source.source_id },
    budget_item_id: source.budget_item_id,
    client: null,
    insurer_authorization_item_id: null,
    internal_exception_id: exception,
    amount,
    description: source.description,
  }
}

const chapa = concept(1, '1000000.00', true)
const alineacion = concept(2, '150000.00', false)
const clips = concept(3, '20000.50', false, true)
const allocation: Pick<Allocation, 'concepts' | 'lines'> = {
  concepts: [chapa, alineacion, clips],
  lines: [
    line(chapa, 'insurer_covered', '800000.00'),
    line(chapa, 'owner_uncovered', '200000.00'),
    line(alineacion, 'owner_responsibility', '150000.00'),
    line(clips, 'owner_responsibility', '20000.50'),
  ],
}

describe('reparto: grilla y cuerpo del PATCH', () => {
  it('arma la grilla por concepto y tipo, vacía donde no hay porción', () => {
    const grid = gridFromAllocation(allocation)

    expect(grid['work_order_item:1']).toEqual({ insurer_covered: '800000', owner_responsibility: '', owner_uncovered: '200000', owner_deductible: '', workshop_absorbed: '' })
    expect(grid['work_order_part:3'].owner_responsibility).toBe('20000.5')
  })

  it('la diferencia es 0 con el concepto completo y marca lo que falta o sobra, en céntimos', () => {
    const grid = gridFromAllocation(allocation)

    expect(conceptDifference(chapa, grid['work_order_item:1'])).toBe(0)
    expect(conceptDifference(clips, grid['work_order_part:3'])).toBe(0)
    expect(conceptDifference(chapa, { ...grid['work_order_item:1'], owner_uncovered: '150000' })).toBe(5000000)
    expect(conceptDifference(chapa, { ...grid['work_order_item:1'], workshop_absorbed: '0,10' })).toBe(-10)
    expect(toCents('')).toBe(0)
  })

  it('solo manda las porciones con importe mayor a 0 y la absorción con la excepción disponible', () => {
    const grid = gridFromAllocation(allocation)
    grid['work_order_item:1'] = { insurer_covered: '800000', owner_responsibility: '0', owner_uncovered: '150000', owner_deductible: '', workshop_absorbed: '50000' }

    expect(allocationLinesInput(allocation, grid, 9)).toEqual([
      { source_type: 'work_order_item', source_id: 1, portion_type: 'insurer_covered', amount: '800000.00' },
      { source_type: 'work_order_item', source_id: 1, portion_type: 'owner_uncovered', amount: '150000.00' },
      { source_type: 'work_order_item', source_id: 1, portion_type: 'workshop_absorbed', amount: '50000.00', internal_exception_id: 9 },
      { source_type: 'work_order_item', source_id: 2, portion_type: 'owner_responsibility', amount: '150000.00' },
      { source_type: 'work_order_part', source_id: 3, portion_type: 'owner_responsibility', amount: '20000.50' },
    ])
  })

  it('sin excepción disponible conserva la que ya tenía la porción del taller', () => {
    const withAbsorption = { ...allocation, lines: [...allocation.lines, line(alineacion, 'workshop_absorbed', '1000.00', 4)] }
    const body = allocationLinesInput(withAbsorption, gridFromAllocation(withAbsorption), null)

    expect(body.find((item) => item.portion_type === 'workshop_absorbed')).toMatchObject({ source_id: 2, internal_exception_id: 4 })
  })

  it('la aseguradora y "no cubierto" solo aplican a los conceptos que puede cubrir (R4)', () => {
    expect(portionApplies(chapa, 'insurer_covered')).toBe(true)
    expect(portionApplies(clips, 'insurer_covered')).toBe(false)
    expect(portionApplies(alineacion, 'owner_uncovered')).toBe(false)
    expect(portionApplies(clips, 'workshop_absorbed')).toBe(true)
    expect(portionApplies(chapa, 'owner_deductible')).toBe(true)
    expect(portionApplies(clips, 'owner_deductible')).toBe(false)
  })
})

describe('reparto: deducible de la modalidad neta (M10)', () => {
  const withDeductible = { ...allocation, lines: [...allocation.lines, line(chapa, 'owner_deductible', '200000.00')] }

  it('la columna del deducible aparece solo si el reparto la usa o si R11 falla', () => {
    const columns = (value: Pick<Allocation, 'lines' | 'checks'>) => visiblePortionTypes(value).map((type) => type.value)

    expect(columns({ lines: allocation.lines, checks: null })).not.toContain('owner_deductible')
    expect(columns({ lines: withDeductible.lines, checks: null })).toContain('owner_deductible')
    expect(
      columns({ lines: allocation.lines, checks: [{ rule: 'R11', ok: false, message: '', error_code: 'ALLOCATION_DEDUCTIBLE_MISMATCH', status: 422 }] }),
    ).toContain('owner_deductible')
  })

  it('el deducible entra en la grilla, la diferencia y el cuerpo del PATCH', () => {
    const grid = gridFromAllocation(withDeductible)

    expect(grid['work_order_item:1'].owner_deductible).toBe('200000')
    // 800.000 cubiertos + 200.000 no cubiertos + 200.000 de deducible sobre un concepto de 1.000.000: sobran 200.000.
    expect(conceptDifference(chapa, grid['work_order_item:1'])).toBe(-20000000)
    expect(allocationLinesInput(withDeductible, grid, null)).toContainEqual({
      source_type: 'work_order_item',
      source_id: 1,
      portion_type: 'owner_deductible',
      amount: '200000.00',
    })
  })
})
