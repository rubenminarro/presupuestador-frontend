import type { StatusMap } from '@/components/ui/StatusBadge'
import type { Payment } from '@/features/payments/api'
import { deleteData, downloadFile, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type InvoiceStatus = 'draft' | 'issued' | 'cancelled'
export type InvoiceCondition = 'cash' | 'credit'
/** `credited`: saldada solo con notas de crédito registradas, sin pagos (P10). */
export type InvoicePaymentStatus = 'unpaid' | 'partial' | 'paid' | 'credited'
export type TaxRate = 0 | 5 | 10

/** Línea de la factura: precios con IVA incluido, en guaraníes; `base_unit_price` es el precio sin IVA de la OT. */
export interface InvoiceItem {
  id: number
  source: { type: string; id: number }
  description: string
  quantity: string
  tax_rate: { value: TaxRate; label: string }
  base_unit_price: string
  unit_price: string
  gross_amount: string
  discount: string
  total: string
}

/** `InvoiceResource` (listado). Importes en guaraníes, con IVA incluido. */
export interface InvoiceSummary {
  id: number
  /** null hasta emitir. */
  number: string | null
  status: { value: InvoiceStatus; label: string }
  work_order_id: number
  work_order_code?: string
  client_id: number
  customer_name: string
  customer_tax_id: string | null
  condition: { value: InvoiceCondition; label: string }
  issue_date: string | null
  due_date: string | null
  total: string
  balance: string
  /** Solo en facturas emitidas. */
  payment_status: InvoicePaymentStatus | null
  created_at: string
}

/** `ShowInvoiceResource`: totales por tasa e IVA liquidado los calcula el backend. */
export interface Invoice {
  id: number
  number: string | null
  status: { value: InvoiceStatus; label: string }
  work_order_id: number
  work_order_code?: string
  client_id: number
  stamp: { id: number | null; stamp_number: string | null; valid_until: string | null }
  customer: { name: string; tax_id: string | null; address: string | null }
  condition: { value: InvoiceCondition; label: string }
  issue_date: string | null
  due_date: string | null
  items?: InvoiceItem[]
  totals: {
    exempt: string
    taxed_5: string
    taxed_10: string
    iva_5: string
    iva_10: string
    iva_total: string
    discount: string
    total: string
  }
  /** El saldo descuenta pagos y notas de crédito (`credited_total`, P10). */
  payment_summary: { paid_total: string; credited_total: string; balance: string; status: InvoicePaymentStatus | null }
  /** Solo en `GET /invoices/{id}`. */
  payments?: Payment[]
  /** Notas de crédito registradas sobre la factura, también las anuladas (P10). Solo en `GET /invoices/{id}`. */
  credit_notes?: CreditNote[]
  issued_at: string | null
  issued_by: number | null
  cancelled_at: string | null
  cancelled_by: number | null
  cancellation_reason: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export interface InvoiceInput {
  customer_name: string
  customer_tax_id: string | null
  customer_address: string | null
  condition: InvoiceCondition
  /** Solo a crédito; al contado el backend la vacía. */
  due_date: string | null
}

export interface InvoiceItemInput {
  description: string
  tax_rate: TaxRate
  discount: number
}

export type CreditNoteStatus = 'registered' | 'cancelled'

/**
 * `InvoiceCreditNoteResource` (P10): nota de crédito emitida fuera del sistema y registrada sobre la factura. Importes
 * con IVA, en guaraníes, salvo `base_amount` (sin IVA). Inmutable: un registro mal cargado se anula con motivo.
 */
export interface CreditNote {
  id: number
  invoice_id: number
  number: string
  stamp_number: string | null
  issue_date: string
  reason: string
  status: { value: CreditNoteStatus; label: string }
  total: string
  items?: { id: number; invoice_item_id: number; description: string; tax_rate: TaxRate; amount: string; base_amount: string }[]
  registered_by: { id: number; name: string } | null
  cancelled_at: string | null
  cancelled_by: { id: number; name: string } | null
  cancellation_reason: string | null
  created_at: string
}

export interface CreditNoteInput {
  number: string
  stamp_number: string | null
  issue_date: string
  reason: string
  items: { invoice_item_id: number; amount: number }[]
}

export const CREDIT_NOTE_STATUS: StatusMap = {
  registered: { label: 'Registrada', color: 'teal' },
  cancelled: { label: 'Anulada', color: 'red' },
}

/** Lo que le queda por acreditar a cada línea: su total menos lo acreditado en notas vigentes (guaraníes enteros). */
export function creditableByItem(invoice: Pick<Invoice, 'items' | 'credit_notes'>): Record<number, number> {
  const remaining: Record<number, number> = {}
  for (const item of invoice.items ?? []) remaining[item.id] = Math.round(Number(item.total))
  for (const note of invoice.credit_notes ?? []) {
    if (note.status.value !== 'registered') continue
    for (const line of note.items ?? []) {
      if (line.invoice_item_id in remaining) remaining[line.invoice_item_id] -= Math.round(Number(line.amount))
    }
  }
  return remaining
}

/** Cuerpo del registro: solo las líneas con importe mayor a 0; timbrado vacío → null. */
export function creditNoteInput(
  values: { number: string; stamp_number: string; issue_date: string; reason: string },
  amounts: Record<number, string>,
): CreditNoteInput {
  return {
    number: values.number.trim(),
    stamp_number: values.stamp_number.trim() === '' ? null : values.stamp_number.trim(),
    issue_date: values.issue_date,
    reason: values.reason.trim(),
    items: Object.entries(amounts)
      .map(([id, amount]) => ({ invoice_item_id: Number(id), amount: Number(amount.trim()) }))
      .filter((item) => Number.isFinite(item.amount) && item.amount > 0),
  }
}

export const creditNotesApi = {
  create: (invoiceId: number, body: CreditNoteInput) => postData<CreditNote>(`/invoices/${invoiceId}/credit-notes`, body),
  cancel: (invoiceId: number, id: number, reason: string) => postData<CreditNote>(`/invoices/${invoiceId}/credit-notes/${id}/cancel`, { reason }),
}

export const INVOICE_STATUS: StatusMap = {
  draft: { label: 'Borrador', color: 'secondary' },
  issued: { label: 'Emitida', color: 'blue' },
  cancelled: { label: 'Anulada', color: 'red' },
}

export const INVOICE_PAYMENT_STATUS: StatusMap = {
  unpaid: { label: 'Pendiente', color: 'yellow' },
  partial: { label: 'Pago parcial', color: 'orange' },
  paid: { label: 'Pagada', color: 'green' },
  credited: { label: 'Acreditada', color: 'teal' },
}

export const INVOICE_CONDITIONS: Record<InvoiceCondition, string> = {
  cash: 'Contado',
  credit: 'Crédito',
}

export const TAX_RATES: Record<TaxRate, string> = {
  10: 'IVA 10%',
  5: 'IVA 5%',
  0: 'Exenta',
}

export const invoicesApi = {
  list: (params: ListParams) => getPage<InvoiceSummary>('/invoices', params),
  show: (id: number) => getData<Invoice>(`/invoices/${id}`),
  /** Borrador con lo realmente usado en la OT completada. */
  createFromWorkOrder: (workOrderId: number) => postData<Invoice>(`/work-orders/${workOrderId}/invoice`),
  update: (id: number, body: InvoiceInput) => patchData<Invoice>(`/invoices/${id}`, body),
  updateItem: (id: number, itemId: number, body: InvoiceItemInput) => patchData<Invoice>(`/invoices/${id}/items/${itemId}`, body),
  /** Sin timbrado: el único activo y vigente. */
  issue: (id: number, stampId: number | null) => postData<Invoice>(`/invoices/${id}/issue`, { invoice_stamp_id: stampId }),
  cancel: (id: number, reason: string) => postData<Invoice>(`/invoices/${id}/cancel`, { reason }),
  remove: (id: number) => deleteData(`/invoices/${id}`),
  pdf: (invoice: Pick<Invoice, 'id' | 'number'>) => downloadFile(`/invoices/${invoice.id}/pdf`, `factura-${invoice.number ?? invoice.id}.pdf`),
}
