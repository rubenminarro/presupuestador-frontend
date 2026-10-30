import { describe, expect, it } from 'vitest'
import { insurerInput, type InsurerFormValues } from '@/features/insurers/api'

const values: InsurerFormValues = {
  mode: 'new',
  client_id: 12,
  business_name: ' Seguros del Sur S.A. ',
  document_number: ' 80012345-6 ',
  email: ' Siniestros@SegurosDelSur.com.py ',
  phone: ' +595211234567 ',
  address: '',
  payment_term_days: '45',
  notes: ' ',
}

describe('insurerInput', () => {
  it('con cliente nuevo manda sus datos y no client_id', () => {
    const body = insurerInput(values)

    expect(body).toEqual({
      payment_term_days: 45,
      notes: null,
      client: {
        business_name: 'Seguros del Sur S.A.',
        document_number: '80012345-6',
        email: 'siniestros@segurosdelsur.com.py',
        phone: '+595211234567',
        address: null,
      },
    })
    expect(body).not.toHaveProperty('client_id')
  })

  it('con cliente existente manda solo client_id (el backend prohíbe los dos)', () => {
    const body = insurerInput({ ...values, mode: 'existing', payment_term_days: '' })

    expect(body).toEqual({ client_id: 12, payment_term_days: null, notes: null })
    expect(body).not.toHaveProperty('client')
  })
})
