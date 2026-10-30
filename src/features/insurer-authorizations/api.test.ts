import { describe, expect, it } from 'vitest'
import { authorizationInput, type AuthorizationHeader, type AuthorizationRow } from '@/features/insurer-authorizations/api'

const header: AuthorizationHeader = {
  amounts_include_tax: null,
  decided_at: '2026-10-30',
  channel: 'email',
  authorization_number: ' AUT-001 ',
  adjuster_name: '',
  notes: '',
  document_ids: [],
}

const rows: AuthorizationRow[] = [
  { budget_item_id: 1, decision: 'partial', authorized_total: ' 330000 ', authorized_quantity: '', notes: 'Tope del baremo.' },
  { budget_item_id: 2, decision: 'authorized', authorized_total: '999', authorized_quantity: '9', notes: '' },
  { budget_item_id: 3, decision: 'not_covered', authorized_total: '', authorized_quantity: '', notes: '' },
]

describe('authorizationInput', () => {
  it('manda una línea por ítem; importe y cantidad solo en las parciales', () => {
    const body = authorizationInput({ ...header, amounts_include_tax: true }, rows)

    expect(body.amounts_include_tax).toBe(true)
    expect(body.authorization_number).toBe('AUT-001')
    expect(body.adjuster_name).toBeNull()
    expect(body.items).toEqual([
      { budget_item_id: 1, decision: 'partial', authorized_total: '330000', authorized_quantity: null, notes: 'Tope del baremo.' },
      { budget_item_id: 2, decision: 'authorized', notes: null },
      { budget_item_id: 3, decision: 'not_covered', notes: null },
    ])
  })

  it('sin elegir la unidad la manda en null (el backend la exige) y sin documentos no manda document_ids', () => {
    const body = authorizationInput(header, rows)

    expect(body.amounts_include_tax).toBeNull()
    expect(body).not.toHaveProperty('document_ids')
    expect(authorizationInput({ ...header, document_ids: [7] }, rows)).toMatchObject({ document_ids: [7] })
  })
})
