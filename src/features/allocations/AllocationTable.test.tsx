import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { gridFromAllocation, type Allocation, type AllocationGrid } from '@/features/allocations/api'
import { AllocationTable } from '@/features/allocations/WorkOrderAllocation'

const allocation: Pick<Allocation, 'concepts' | 'lines' | 'checks'> = {
  checks: null,
  concepts: [
    {
      source_type: 'work_order_item',
      source_id: 1,
      budget_item_id: 1,
      description: 'Chapería',
      is_extra: false,
      responsibility: { value: 'insurer', label: 'Aseguradora' },
      coverable: true,
      quantity: '1.00',
      base_unit_price: '1000000.00',
      base_total: '1000000.00',
      authorized_total: '800000.00',
    },
    {
      source_type: 'work_order_part',
      source_id: 7,
      budget_item_id: null,
      description: 'Clips',
      is_extra: true,
      responsibility: { value: 'owner', label: 'Dueño' },
      coverable: false,
      quantity: '2.00',
      base_unit_price: '10000.00',
      base_total: '20000.00',
      authorized_total: null,
    },
  ],
  lines: [
    {
      id: 1,
      portion_type: { value: 'insurer_covered', label: '' },
      source: { type: 'work_order_item', id: 1 },
      budget_item_id: 1,
      client: null,
      insurer_authorization_item_id: 3,
      internal_exception_id: null,
      amount: '800000.00',
      description: 'Chapería',
    },
    {
      id: 2,
      portion_type: { value: 'owner_responsibility', label: '' },
      source: { type: 'work_order_part', id: 7 },
      budget_item_id: null,
      client: null,
      insurer_authorization_item_id: null,
      internal_exception_id: null,
      amount: '20000.00',
      description: 'Clips',
    },
  ],
}

function Editor() {
  const [grid, setGrid] = useState<AllocationGrid>(gridFromAllocation(allocation))
  return <AllocationTable allocation={allocation} grid={grid} onChange={(key, type, value) => setGrid((g) => ({ ...g, [key]: { ...g[key], [type]: value } }))} />
}

describe('AllocationTable', () => {
  it('un extra no ofrece la aseguradora ni "no cubierto" y la diferencia se actualiza al editar', async () => {
    const user = userEvent.setup()
    render(<Editor />)

    expect(screen.queryByLabelText('Aseguradora: Clips')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('No cubierto: Clips')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Taller: Clips')).toBeInTheDocument()
    expect(screen.getByText('Autorizado para el ítem: Gs. 800.000')).toBeInTheDocument()

    const chapa = screen.getByText('Chapería').closest('tr') as HTMLElement
    expect(within(chapa).getByText('Gs. 200.000')).toHaveClass('text-red')

    await user.type(screen.getByLabelText('No cubierto: Chapería'), '200000')
    expect(within(chapa).getAllByText('0').at(-1)).toHaveClass('text-secondary')
  })
})
