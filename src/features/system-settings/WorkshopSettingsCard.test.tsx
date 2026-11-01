import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  changedWorkshopSettings,
  systemSettingsApi,
  workshopSettingsValues,
  type WorkshopSettings,
} from '@/features/system-settings/api'
import { WorkshopSettingsCard } from '@/features/system-settings/WorkshopSettingsCard'

const settings: WorkshopSettings = {
  company_name: 'Taller Central',
  company_legal_name: null,
  company_tax_id: '80000001-1',
  company_activity: null,
  company_address: null,
  company_city: null,
  company_phone: null,
  company_email: null,
  default_tax_rate: 10,
  mail_from_name: 'Taller Central',
  mail_from_address: 'avisos@mail.com.py',
  reminders_at: '08:00',
  invoice_due_soon_days: 3,
  invoice_overdue_repeat_days: 7,
}

function renderCard() {
  vi.spyOn(systemSettingsApi, 'workshop').mockResolvedValue(settings)
  const update = vi.spyOn(systemSettingsApi, 'updateWorkshop').mockResolvedValue({ data: settings, meta: null })

  render(
    <QueryClientProvider client={new QueryClient()}>
      <WorkshopSettingsCard />
    </QueryClientProvider>,
  )

  return update
}

describe('changedWorkshopSettings', () => {
  const initial = workshopSettingsValues(settings)

  it('no envía lo que no cambió, para no fijar en la base los valores del .env', () => {
    expect(changedWorkshopSettings(initial, { ...initial })).toEqual({})
    expect(changedWorkshopSettings(initial, { ...initial, company_city: 'Luque' })).toEqual({ company_city: 'Luque' })
  })

  it('un campo vaciado va en null y la tasa exenta va como 0', () => {
    expect(changedWorkshopSettings(initial, { ...initial, company_name: '' })).toEqual({ company_name: null })
    expect(changedWorkshopSettings(initial, { ...initial, default_tax_rate: '0' })).toEqual({ default_tax_rate: 0 })
  })
})

describe('WorkshopSettingsCard', () => {
  it('guarda solo lo cambiado y empieza sin nada para guardar', async () => {
    const update = renderCard()
    const user = userEvent.setup()

    const save = await screen.findByRole('button', { name: 'Guardar' })
    expect(save).toBeDisabled()

    await user.type(screen.getByLabelText('Ciudad'), 'Luque')
    await user.click(save)

    expect(update).toHaveBeenCalledWith({ company_city: 'Luque' })
  })

  it('advierte el efecto de cambiar la tasa de IVA antes de guardar', async () => {
    renderCard()
    const user = userEvent.setup()

    const rate = await screen.findByLabelText('Tasa de IVA por defecto')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.selectOptions(rate, '5')

    expect(screen.getByRole('alert')).toHaveTextContent('un presupuesto ya aprobado se facturará con esta tasa')
  })
})
