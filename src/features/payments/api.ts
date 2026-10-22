import type { StatusMap } from '@/components/ui/StatusBadge'
import type { InvoicePaymentStatus } from '@/features/invoices/api'
import { downloadFile, getData, getPage, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check'
export type PaymentStatus = 'registered' | 'cancelled'

/** `PaymentResource`; el detalle (`ShowPaymentResource`) suma entregado, banco, notas, factura y anulación. Guaraníes. */
export interface Payment {
  id: number
  invoice_id?: number
  invoice_number?: string | null
  /** Solo en el listado (`/payments`). */
  customer_name?: string
  /** `REC-000001`: solo pagos de facturas a crédito. */
  receipt_number: string | null
  payment_date: string
  amount: string
  amount_received?: string | null
  change_amount: string | null
  method: { value: PaymentMethod; label: string }
  reference: string | null
  bank?: string | null
  notes?: string | null
  status: { value: PaymentStatus; label: string }
  invoice?: {
    id: number
    number: string | null
    customer_name: string
    condition: 'cash' | 'credit'
    total: string
    paid_total: string
    balance: string
    payment_status: InvoicePaymentStatus | null
  }
  created_by?: number
  cancelled_at?: string | null
  cancelled_by?: number | null
  cancellation_reason?: string | null
  created_at: string
  updated_at?: string
}

export interface PaymentInput {
  amount: number | null
  method: PaymentMethod
  /** Solo efectivo: lo entregado por el cliente (vacío: el monto exacto, sin vuelto). */
  amount_received?: number | null
  /** Vacío: hoy. */
  payment_date: string | null
  reference: string | null
  bank: string | null
  notes: string | null
}

export interface CashSummary {
  period: { date_from: string; date_to: string }
  payments_count: number
  total: string
  by_method: { method: PaymentMethod; label: string; payments_count: number; total: string }[]
  cash: { received: string; change: string }
  cancelled_count: number
}

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  check: 'Cheque',
}

export const PAYMENT_STATUS: StatusMap = {
  registered: { label: 'Registrado', color: 'green' },
  cancelled: { label: 'Anulado', color: 'secondary' },
}

export const paymentsApi = {
  list: (params: ListParams) => getPage<Payment>('/payments', params),
  show: (id: number) => getData<Payment>(`/payments/${id}`),
  create: (invoiceId: number, body: PaymentInput) => postData<Payment>(`/invoices/${invoiceId}/payments`, body),
  cancel: (id: number, reason: string) => postData<Payment>(`/payments/${id}/cancel`, { reason }),
  /** Sin fechas: el día de hoy. */
  summary: (params: ListParams) => getData<CashSummary>('/payments/summary', params),
  receipt: (payment: Pick<Payment, 'id' | 'receipt_number'>) =>
    downloadFile(`/payments/${payment.id}/receipt`, `recibo-${payment.receipt_number ?? payment.id}.pdf`),
}
