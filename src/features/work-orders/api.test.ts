import { describe, expect, it } from 'vitest'
import { workOrderInvoices, type WorkOrderInvoiceSummary } from '@/features/work-orders/api'

const legacy = { id: 1, number: '001-001-0000001', status: { value: 'issued' as const, label: 'Emitida' }, total: '1067000.00' }

const invoice = (id: number, customer: string): WorkOrderInvoiceSummary => ({
  ...legacy,
  id,
  client_id: id,
  customer_name: customer,
  condition: 'cash',
  allocation_id: 3,
  balance: '0.00',
  payment_status: 'paid',
})

describe('workOrderInvoices', () => {
  it('usa todas las facturas vigentes de la OT (una por responsable)', () => {
    const invoices = [invoice(1, 'Seguros del Sur S.A.'), invoice(2, 'Ana Gómez')]

    expect(workOrderInvoices({ invoices, invoice: legacy })).toHaveLength(2)
  })

  it('cae en la clave heredada si no llega la lista', () => {
    expect(workOrderInvoices({ invoice: legacy })).toEqual([legacy])
    expect(workOrderInvoices({ invoice: null })).toEqual([])
  })
})
