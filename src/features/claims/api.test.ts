import { describe, expect, it } from 'vitest'
import { claimDocumentFormData, claimFormValues, claimUpdateInput, newClaimInput, type Claim } from '@/features/claims/api'

const claim: Claim = {
  id: 4,
  code: 'SIN-000004',
  status: { value: 'open', label: 'Abierto' },
  claim_type: { value: 'third_party', label: 'De tercero' },
  claim_number: 'SDS-2026-0311',
  policy_number: null,
  loss_date: '2026-10-20',
  loss_description: 'Lo chocaron de atrás.',
  reception: undefined,
  insurer: { id: 2, code: 'ASE-000001', name: 'Seguros del Sur S.A.', document_number: '80012345-6', status: 'active' },
  insured: { client_id: null, name: 'Pedro Cáceres', document: '3456789', phone: null, email: null },
  adjuster: { name: 'Ramón Giménez', phone: null, email: null, inspection_scheduled_at: '2026-10-21T10:00:00.000000Z', inspected_at: null },
  deductible_amount: '0.00',
  coverage_notes: null,
  closed_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
}

describe('siniestros', () => {
  it('el alta lleva recepción, aseguradora y tipo; lo vacío va en null', () => {
    const body = newClaimInput(9, { ...claimFormValues(), insurer_id: 2, loss_date: '2026-10-29', deductible_amount: '' })

    expect(body).toMatchObject({ reception_id: 9, insurer_id: 2, claim_type: 'own', loss_date: '2026-10-29', insured_name: null })
    // Deducible vacío = desconocido (null), no 0.
    expect(body.deductible_amount).toBeNull()
  })

  it('la edición no manda recepción, aseguradora ni tipo, y no vacía al asegurado', () => {
    const values = claimFormValues(claim)
    expect(values.inspection_scheduled_at).toBe('2026-10-21T10:00')

    const body = claimUpdateInput({ ...values, insured_name: '  ', deductible_amount: '500000' })

    expect(body).not.toHaveProperty('reception_id')
    expect(body).not.toHaveProperty('insurer_id')
    expect(body).not.toHaveProperty('claim_type')
    expect(body).not.toHaveProperty('insured_name')
    expect(body).toMatchObject({ deductible_amount: '500000', claim_number: 'SDS-2026-0311', policy_number: null })
  })

  it('el documento se sube como multipart con su tipo (las notas vacías no se envían)', () => {
    const file = new File(['%PDF-1.4'], 'denuncia.pdf', { type: 'application/pdf' })
    const form = claimDocumentFormData(file, 'loss_report', '  ')

    expect(form.get('file')).toBe(file)
    expect(form.get('type')).toBe('loss_report')
    expect(form.has('notes')).toBe(false)
  })
})
