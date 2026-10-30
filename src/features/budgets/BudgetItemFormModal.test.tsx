import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { budgetsApi, type BudgetItem } from '@/features/budgets/api'
import { BudgetItemFormModal } from '@/features/budgets/BudgetItemFormModal'

function renderModal(props: { hasOpenClaim?: boolean; item?: BudgetItem | null } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <BudgetItemFormModal budgetId={1} item={props.item ?? null} hasOpenClaim={props.hasOpenClaim} onClose={() => {}} />
    </QueryClientProvider>,
  )
}

describe('BudgetItemFormModal: a cargo de', () => {
  it('sin siniestro abierto no ofrece la aseguradora ni manda responsibility', async () => {
    const user = userEvent.setup()
    const create = vi.spyOn(budgetsApi, 'createItem').mockResolvedValue({} as BudgetItem)
    renderModal()

    expect(screen.queryByLabelText('Aseguradora')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Descripción'), 'Chapería')
    await user.type(screen.getByLabelText('Precio unitario (sin IVA)'), '500000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(create.mock.calls[0][1]).not.toHaveProperty('responsibility')
  })

  it('con siniestro abierto arranca en el dueño y se puede pasar a la aseguradora', async () => {
    const user = userEvent.setup()
    const create = vi.spyOn(budgetsApi, 'createItem').mockResolvedValue({} as BudgetItem)
    renderModal({ hasOpenClaim: true })

    expect(screen.getByLabelText('Dueño')).toBeChecked()
    await user.click(screen.getByLabelText('Aseguradora'))
    await user.type(screen.getByLabelText('Descripción'), 'Chapería')
    await user.type(screen.getByLabelText('Precio unitario (sin IVA)'), '500000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(create.mock.calls[0][1]).toMatchObject({ responsibility: 'insurer', type: 'labor' })
  })
})
