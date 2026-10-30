import { describe, expect, it } from 'vitest'
import { creditableByItem, creditNoteInput, type CreditNote, type Invoice, type InvoiceItem } from '@/features/invoices/api'

function item(id: number, total: string): InvoiceItem {
  return {
    id,
    source: { type: 'work_order_item', id },
    description: `Línea ${id}`,
    quantity: '1.00',
    tax_rate: { value: 10, label: 'IVA 10%' },
    base_unit_price: '0',
    unit_price: total,
    gross_amount: total,
    discount: '0',
    total,
  }
}

function note(status: 'registered' | 'cancelled', lines: [number, string][]): CreditNote {
  return {
    id: Math.random(),
    invoice_id: 1,
    number: '001-001-0000001',
    stamp_number: null,
    issue_date: '2026-10-30',
    reason: 'Ajuste',
    status: { value: status, label: status },
    total: '0',
    items: lines.map(([invoiceItemId, amount], index) => ({
      id: index,
      invoice_item_id: invoiceItemId,
      description: '',
      tax_rate: 10,
      amount,
      base_amount: '0',
    })),
    registered_by: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    created_at: '2026-10-30T10:00:00Z',
  }
}

describe('notas de crédito', () => {
  it('lo que le queda a cada línea descuenta solo las notas vigentes', () => {
    const invoice: Pick<Invoice, 'items' | 'credit_notes'> = {
      items: [item(1, '1100000'), item(2, '220000')],
      credit_notes: [note('registered', [[1, '100000']]), note('cancelled', [[1, '500000'], [2, '220000']]), note('registered', [[1, '50000']])],
    }

    expect(creditableByItem(invoice)).toEqual({ 1: 950000, 2: 220000 })
  })

  it('el cuerpo lleva solo las líneas con importe y el timbrado vacío en null', () => {
    const body = creditNoteInput(
      { number: ' 001-002-0000045 ', stamp_number: ' ', issue_date: '2026-10-30', reason: ' Descuento acordado ' },
      { 1: '100000', 2: '', 3: '0' },
    )

    expect(body).toEqual({
      number: '001-002-0000045',
      stamp_number: null,
      issue_date: '2026-10-30',
      reason: 'Descuento acordado',
      items: [{ invoice_item_id: 1, amount: 100000 }],
    })
  })
})
