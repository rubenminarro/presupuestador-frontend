import { describe, expect, it } from 'vitest'
import { clientInput, type ClientFormValues } from '@/features/clients/api'

const values: ClientFormValues = {
  kind: 'person',
  document_number: ' 1234567 ',
  first_name: ' Ana ',
  last_name: ' Gómez ',
  business_name: 'Restos de otro tipo',
  email: ' Ana@Example.COM ',
  phone: ' 0981123456 ',
  address: '  ',
  notifications_enabled: true,
  notes: '',
}

describe('clientInput', () => {
  it('envía una persona sin la razón social', () => {
    expect(clientInput(values)).toEqual({
      kind: 'person',
      document_number: '1234567',
      first_name: 'Ana',
      last_name: 'Gómez',
      email: 'ana@example.com',
      phone: '0981123456',
      address: null,
      notifications_enabled: true,
      notes: null,
    })
  })

  it('envía una empresa sin nombre ni apellido (el backend los rechaza en null al editar)', () => {
    const body = clientInput({ ...values, kind: 'company', business_name: ' Transportes del Este S.A. ', address: ' Ruta 2 km 20 ' })

    expect(body).toMatchObject({ kind: 'company', business_name: 'Transportes del Este S.A.', address: 'Ruta 2 km 20' })
    expect(body).not.toHaveProperty('first_name')
    expect(body).not.toHaveProperty('last_name')
  })

  it('manda los obligatorios vacíos para que el backend marque el campo', () => {
    expect(clientInput({ ...values, kind: 'company', business_name: '' })).toMatchObject({ business_name: '' })
  })
})
