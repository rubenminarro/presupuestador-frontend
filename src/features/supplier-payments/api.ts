import type { InvoiceCondition, InvoicePaymentStatus } from '@/features/invoices/api'
import type { PaymentMethod, PaymentStatus } from '@/features/payments/api'
import { getData, getPage, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

/** `SupplierPaymentResource`; el detalle (`ShowSupplierPaymentResource`) suma banco, recibo, notas, compra y anulación. */
export interface SupplierPayment {
  id: number
  /** `PAG-000001`. */
  code: string
  purchase_id?: number
  purchase_code?: string
  supplier_id?: number
  supplier_name?: string
  payment_date: string
  amount: string
  method: { value: PaymentMethod; label: string }
  reference: string | null
  bank?: string | null
  supplier_receipt_number?: string | null
  notes?: string | null
  status: { value: PaymentStatus; label: string }
  supplier?: { id: number; name: string; tax_id: string | null }
  purchase?: {
    id: number
    code: string
    supplier_document_number: string | null
    condition: InvoiceCondition
    due_date: string | null
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

export interface SupplierPaymentInput {
  amount: number | null
  method: PaymentMethod
  /** Vacío: hoy. */
  payment_date: string | null
  reference: string | null
  bank: string | null
  supplier_receipt_number: string | null
  notes: string | null
}

/** Egresos a proveedores por medio de pago (sin vuelto ni efectivo recibido, a diferencia del resumen de caja). */
export interface SupplierPaymentSummary {
  period: { date_from: string; date_to: string }
  payments_count: number
  total: string
  by_method: { method: PaymentMethod; label: string; payments_count: number; total: string }[]
  cancelled_count: number
}

export const supplierPaymentsApi = {
  list: (params: ListParams) => getPage<SupplierPayment>('/supplier-payments', params),
  show: (id: number) => getData<SupplierPayment>(`/supplier-payments/${id}`),
  create: (purchaseId: number, body: SupplierPaymentInput) => postData<SupplierPayment>(`/purchases/${purchaseId}/payments`, body),
  cancel: (id: number, reason: string) => postData<SupplierPayment>(`/supplier-payments/${id}/cancel`, { reason }),
  /** Sin fechas: el día de hoy. */
  summary: (params: ListParams) => getData<SupplierPaymentSummary>('/supplier-payments/summary', params),
}
