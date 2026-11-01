import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Budget, BudgetItem } from '@/features/budgets/api'
import { claimsApi, type Claim } from '@/features/claims/api'
import { insurerAuthorizationsApi, type InsurerAuthorization } from '@/features/insurer-authorizations/api'
import { AuthorizationFormModal } from '@/features/insurer-authorizations/AuthorizationFormModal'

const item = (id: number, description: string, responsibility: 'owner' | 'insurer'): BudgetItem => ({
  id,
  budget_id: 1,
  type: 'labor',
  type_label: 'Mano de obra',
  part_id: null,
  service_id: null,
  description,
  quantity: '1.00',
  unit_price: '500000.00',
  total: '500000.00',
  estimated_hours: null,
  notes: null,
  responsibility: { value: responsibility, label: responsibility === 'insurer' ? 'Aseguradora' : 'Dueño' },
})

const budget = {
  id: 1,
  code: 'BUD-000027',
  status: 'sent',
  items: [item(10, 'Chapería de puerta', 'insurer'), item(11, 'Lavado de motor', 'owner')],
} as Budget

const claim = { id: 2, code: 'SIN-000002', status: { value: 'open', label: 'Abierto' }, adjuster: { name: 'Ramón Giménez' } } as Claim

function renderModal() {
  vi.spyOn(claimsApi, 'documents').mockResolvedValue([])
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthorizationFormModal budget={budget} claim={claim} onClose={() => {}} />
    </QueryClientProvider>,
  )
}

describe('AuthorizationFormModal', () => {
  it('lista solo las líneas de la aseguradora y la unidad arranca sin elegir', () => {
    renderModal()

    expect(screen.getByText('Chapería de puerta')).toBeInTheDocument()
    expect(screen.queryByText('Lavado de motor')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Incluyen IVA')).not.toBeChecked()
    expect(screen.getByLabelText('No incluyen IVA')).not.toBeChecked()
    expect(screen.getByLabelText('Perito')).toHaveValue('Ramón Giménez')
  })

  it('la fecha propuesta es la del taller, también a la noche', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 2, 22, 0))

    renderModal()

    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-11-02')
    vi.useRealTimers()
  })

  it('una parcial pide el importe y se envía con la unidad elegida', async () => {
    const user = userEvent.setup()
    const create = vi.spyOn(insurerAuthorizationsApi, 'create').mockResolvedValue({ id: 5 } as InsurerAuthorization)
    renderModal()

    expect(screen.queryByLabelText('Importe autorizado de Chapería de puerta')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Decisión sobre Chapería de puerta'), 'partial')
    await user.type(screen.getByLabelText('Importe autorizado de Chapería de puerta'), '330000')
    await user.click(screen.getByLabelText('Incluyen IVA'))
    await user.selectOptions(screen.getByLabelText('Medio'), 'email')
    await user.click(screen.getByRole('button', { name: 'Registrar autorización' }))

    expect(create).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        amounts_include_tax: true,
        channel: 'email',
        items: [{ budget_item_id: 10, decision: 'partial', authorized_total: '330000', authorized_quantity: null, notes: null }],
      }),
    )
  })
})
