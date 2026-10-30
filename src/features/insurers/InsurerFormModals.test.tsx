import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { insurersApi, type Insurer } from '@/features/insurers/api'
import { NewInsurerModal } from '@/features/insurers/InsurerFormModals'

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <NewInsurerModal onClose={() => {}} onSaved={() => {}} />
    </QueryClientProvider>,
  )
}

describe('NewInsurerModal', () => {
  it('con cliente nuevo pide los datos de la empresa; con existente, el buscador de empresas', async () => {
    const user = userEvent.setup()
    renderModal()

    expect(screen.getByLabelText('Razón social')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Cliente existente'))

    expect(screen.queryByLabelText('Razón social')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Cliente empresa')).toBeInTheDocument()
  })

  it('crea la aseguradora con el cliente nuevo', async () => {
    const user = userEvent.setup()
    const create = vi.spyOn(insurersApi, 'create').mockResolvedValue({ data: { id: 3 } as Insurer, meta: null })
    renderModal()

    await user.type(screen.getByLabelText('Razón social'), 'Seguros del Sur S.A.')
    await user.type(screen.getByLabelText('RUC'), '80012345-6')
    await user.type(screen.getByLabelText('Teléfono'), '+595211234567')
    await user.type(screen.getByLabelText('Email'), 'siniestros@segurosdelsur.com.py')
    await user.type(screen.getByLabelText('Plazo de pago (días)'), '45')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_term_days: 45, client: expect.objectContaining({ business_name: 'Seguros del Sur S.A.' }) }),
    )
  })
})
