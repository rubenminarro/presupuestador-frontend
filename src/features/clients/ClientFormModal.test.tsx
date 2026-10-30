import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { clientsApi, type Client } from '@/features/clients/api'
import { ClientFormModal } from '@/features/clients/ClientFormModal'

function renderForm(client: Client | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ClientFormModal client={client} onClose={() => {}} />
    </QueryClientProvider>,
  )
}

const company: Client = {
  id: 7,
  kind: { value: 'company', label: 'Empresa' },
  document_number: '80012345-6',
  first_name: null,
  last_name: null,
  business_name: 'Seguros del Sur S.A.',
  display_name: 'Seguros del Sur S.A.',
  phone: '+595211234567',
  email: 'siniestros@segurosdelsur.com.py',
  address: null,
  notifications_enabled: false,
  notes: null,
  vehicles: [],
  created_at: '2026-10-29T10:00:00Z',
  updated_at: '2026-10-29T10:00:00Z',
}

describe('ClientFormModal', () => {
  it('muestra nombre y apellido para una persona y la razón social para una empresa', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.queryByLabelText('Razón social')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Empresa'))

    expect(screen.getByLabelText('Razón social')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.getByLabelText('RUC')).toBeInTheDocument()
  })

  it('crea una empresa sin enviar nombre ni apellido', async () => {
    const user = userEvent.setup()
    const create = vi.spyOn(clientsApi, 'create').mockResolvedValue(company)
    renderForm()

    await user.click(screen.getByLabelText('Empresa'))
    await user.type(screen.getByLabelText('Razón social'), 'Seguros del Sur S.A.')
    await user.type(screen.getByLabelText('RUC'), '80012345-6')
    await user.type(screen.getByLabelText('Teléfono'), '+595211234567')
    await user.type(screen.getByLabelText('Email'), 'Siniestros@SegurosDelSur.com.py')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(create).toHaveBeenCalledTimes(1)
    const body = create.mock.calls[0][0]
    expect(body).toMatchObject({ kind: 'company', business_name: 'Seguros del Sur S.A.', email: 'siniestros@segurosdelsur.com.py' })
    expect(body).not.toHaveProperty('first_name')
  })

  it('al editar una empresa la carga con su razón social', () => {
    renderForm(company)

    expect(screen.getByLabelText('Empresa')).toBeChecked()
    expect(screen.getByLabelText('Razón social')).toHaveValue('Seguros del Sur S.A.')
  })
})
