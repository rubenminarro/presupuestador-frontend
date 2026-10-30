import type { StatusMap } from '@/components/ui/StatusBadge'
import type { Invoice } from '@/features/invoices/api'
import { deleteData, getData, patchData, postData } from '@/services/api'

export type AllocationStatus = 'draft' | 'confirmed' | 'superseded'
export type PortionType = 'insurer_covered' | 'owner_responsibility' | 'owner_uncovered' | 'workshop_absorbed'
export type ConceptSourceType = 'work_order_item' | 'work_order_part'

/** Porción del reparto: un concepto vendido, un tipo y su importe sin IVA (> 0). */
export interface AllocationLine {
  id: number
  portion_type: { value: PortionType; label: string }
  source: { type: ConceptSourceType; id: number }
  budget_item_id: number | null
  /** null en la absorción del taller. */
  client: { id: number; display_name: string } | null
  insurer_authorization_item_id: number | null
  internal_exception_id: number | null
  amount: string
  description: string
}

/**
 * Concepto vendido de la OT (`concepts`, sin IVA): lo que debe sumar en el reparto (`base_total`, R1), si puede ir a la
 * aseguradora (`coverable`, R4) y lo autorizado para su ítem del presupuesto (R3, por ítem: varios conceptos lo comparten).
 */
export interface AllocationConcept {
  source_type: ConceptSourceType
  source_id: number
  budget_item_id: number | null
  description: string
  is_extra: boolean
  responsibility: { value: 'owner' | 'insurer'; label: string }
  coverable: boolean
  quantity: string
  base_unit_price: string
  base_total: string
  authorized_total: string | null
}

/** Regla verificada al confirmar (R1–R7 y deducible), en el orden en que se aplica. */
export interface AllocationCheck {
  rule: string
  ok: boolean
  message: string
  error_code: string
  status: number
}

export interface AllocationResponsible {
  /** null: el taller. */
  client_id: number | null
  name: string
  role: 'insurer' | 'owner' | 'workshop'
  amount: string
}

/** `WorkOrderAllocationResource` (M8). Importes sin IVA salvo el deducible, tal como se informa. */
export interface Allocation {
  id: number
  work_order_id: number
  claim_id: number
  version: number
  status: { value: AllocationStatus; label: string }
  sale_total: string
  /** Parte del deducible asignada a esta OT. */
  deductible_amount: string | null
  notes: string | null
  lines: AllocationLine[]
  concepts: AllocationConcept[]
  summary: {
    responsibles: AllocationResponsible[]
    total: string
    deductible_amount: string | null
    /** Deducible mayor a 0: no se factura hasta definir su modalidad (M10). */
    deductible_fiscal_pending: boolean
    warnings: string[]
  }
  /** Solo en el borrador: vista previa de la confirmación. */
  checks: AllocationCheck[] | null
  created_by: { id: number; name: string } | null
  confirmed_by: { id: number; name: string } | null
  confirmed_at: string | null
  superseded_by_id: number | null
  superseded_at: string | null
  created_at: string
}

/** Detalle de `ALLOCATION_HAS_INVOICES` (409): facturas vigentes de la versión confirmada anterior. */
export interface AllocationPendingInvoice {
  invoice_id: number
  number: string | null
  customer_name: string
  status: string
  has_payments: boolean
  credited_total: string
}

export interface AllocationLineInput {
  source_type: ConceptSourceType
  source_id: number
  portion_type: PortionType
  amount: string
  internal_exception_id?: number | null
}

export interface AllocationInput {
  lines: AllocationLineInput[]
  /** No admite vacío: sin valor no se envía. */
  deductible_amount?: string
  notes: string | null
}

export const ALLOCATION_STATUS: StatusMap = {
  draft: { label: 'Borrador', color: 'yellow' },
  confirmed: { label: 'Confirmado', color: 'green' },
  superseded: { label: 'Sustituido', color: 'secondary' },
}

/** Columnas del editor, en orden. */
export const PORTION_TYPES: { value: PortionType; label: string; short: string }[] = [
  { value: 'insurer_covered', label: 'Cubierto por la aseguradora', short: 'Aseguradora' },
  { value: 'owner_responsibility', label: 'A cargo del dueño', short: 'Dueño' },
  { value: 'owner_uncovered', label: 'No cubierto (dueño)', short: 'No cubierto' },
  { value: 'workshop_absorbed', label: 'Absorbido por el taller', short: 'Taller' },
]

export const ALLOCATION_ROLE_LABEL: Record<AllocationResponsible['role'], string> = {
  insurer: 'Aseguradora',
  owner: 'Dueño',
  workshop: 'Taller',
}

export type ConceptKey = `${ConceptSourceType}:${number}`
export type AllocationGrid = Record<ConceptKey, Record<PortionType, string>>

export function conceptKey(concept: { source_type: ConceptSourceType; source_id: number }): ConceptKey {
  return `${concept.source_type}:${concept.source_id}`
}

/** Importe del backend ("800000.00") como texto de un campo ("800000"). */
function amountInput(value: string): string {
  return String(Number(value))
}

/** Grilla editable del borrador: un importe por concepto y tipo de porción ('' si no tiene esa porción). */
export function gridFromAllocation(allocation: Pick<Allocation, 'concepts' | 'lines'>): AllocationGrid {
  const grid = {} as AllocationGrid
  for (const concept of allocation.concepts) {
    grid[conceptKey(concept)] = { insurer_covered: '', owner_responsibility: '', owner_uncovered: '', workshop_absorbed: '' }
  }
  for (const line of allocation.lines) {
    const row = grid[conceptKey({ source_type: line.source.type, source_id: line.source.id })]
    if (row) row[line.portion_type.value] = amountInput(line.amount)
  }
  return grid
}

/** Céntimos enteros de un importe con hasta 2 decimales ('' o inválido = 0), para sumar sin errores de coma flotante. */
export function toCents(value: string): number {
  const number = Number(value.trim().replace(',', '.'))
  return Number.isFinite(number) ? Math.round(number * 100) : 0
}

/** Lo que falta (positivo) o sobra (negativo) para que el concepto sume su total, en céntimos. */
export function conceptDifference(concept: Pick<AllocationConcept, 'base_total'>, row: Record<PortionType, string>): number {
  const assigned = PORTION_TYPES.reduce((sum, type) => sum + toCents(row[type.value]), 0)
  return toCents(concept.base_total) - assigned
}

/** Si la columna aplica al concepto: la aseguradora y "no cubierto" solo en los que puede cubrir (R4). */
export function portionApplies(concept: Pick<AllocationConcept, 'coverable'>, type: PortionType): boolean {
  return concept.coverable || (type !== 'insurer_covered' && type !== 'owner_uncovered')
}

/**
 * Cuerpo del PATCH: solo las porciones con importe mayor a 0. La absorción del taller lleva la excepción disponible de
 * la OT (hay a lo sumo una sin usar); sin ella, la que ya tenía la porción (R6 lo marca al confirmar).
 */
export function allocationLinesInput(
  allocation: Pick<Allocation, 'concepts' | 'lines'>,
  grid: AllocationGrid,
  absorptionExceptionId: number | null,
): AllocationLineInput[] {
  const lines: AllocationLineInput[] = []
  for (const concept of allocation.concepts) {
    const row = grid[conceptKey(concept)]
    if (!row) continue
    for (const type of PORTION_TYPES) {
      const cents = toCents(row[type.value])
      if (cents <= 0) continue
      const line: AllocationLineInput = {
        source_type: concept.source_type,
        source_id: concept.source_id,
        portion_type: type.value,
        amount: (cents / 100).toFixed(2),
      }
      if (type.value === 'workshop_absorbed') {
        const current = allocation.lines.find(
          (item) =>
            item.portion_type.value === 'workshop_absorbed' && item.source.type === concept.source_type && item.source.id === concept.source_id,
        )
        line.internal_exception_id = absorptionExceptionId ?? current?.internal_exception_id ?? null
      }
      lines.push(line)
    }
  }
  return lines
}

export const allocationsApi = {
  /** Todas las versiones de la OT. */
  list: (workOrderId: number) => getData<Allocation[]>(`/work-orders/${workOrderId}/allocations`),
  /** Borrador nuevo: la propuesta del backend o, si hay una confirmada, su copia (corrección). */
  generate: (workOrderId: number) => postData<Allocation>(`/work-orders/${workOrderId}/allocations`),
  update: (workOrderId: number, id: number, body: AllocationInput) => patchData<Allocation>(`/work-orders/${workOrderId}/allocations/${id}`, body),
  confirm: (workOrderId: number, id: number) => postData<Allocation>(`/work-orders/${workOrderId}/allocations/${id}/confirm`),
  remove: (workOrderId: number, id: number) => deleteData(`/work-orders/${workOrderId}/allocations/${id}`),
  /** Factura en borrador para un responsable del reparto confirmado (M9). */
  invoice: (workOrderId: number, id: number, clientId: number) =>
    postData<Invoice>(`/work-orders/${workOrderId}/allocations/${id}/invoices`, { client_id: clientId }),
}
