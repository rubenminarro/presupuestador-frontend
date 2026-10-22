import type { StatusMap } from '@/components/ui/StatusBadge'
import type { InvoiceCondition, InvoicePaymentStatus, TaxRate } from '@/features/invoices/api'
import type { SupplierPayment } from '@/features/supplier-payments/api'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type PurchaseStatus = 'draft' | 'received' | 'cancelled'

/** Línea: costo con IVA incluido (como la factura del proveedor); `net_*` sin IVA, lo que entra al inventario. */
export interface PurchaseItem {
  id: number
  part?: { id: number; code: string; sku: string | null; name: string }
  quantity: string
  tax_rate: { value: TaxRate; label: string }
  unit_cost: string
  total: string
  /** 4 decimales. */
  net_unit_cost: string
  net_total: string
  inventory_movement_id: number | null
}

/** `PurchaseResource` (listado). Importes en guaraníes con IVA incluido; `net_total` sin IVA. */
export interface PurchaseSummary {
  id: number
  /** `COM-000001`. */
  code: string
  status: { value: PurchaseStatus; label: string }
  supplier_id: number
  supplier_name?: string
  supplier_document_number: string | null
  supplier_document_date: string | null
  condition: { value: InvoiceCondition; label: string }
  due_date: string | null
  /** null en un borrador sin líneas. */
  total: string | null
  net_total: string | null
  paid_total: string
  balance: string
  /** Solo en compras recibidas. */
  payment_status: InvoicePaymentStatus | null
  received_at: string | null
  created_at: string
}

/** `ShowPurchaseResource`. */
export interface Purchase {
  id: number
  code: string
  status: { value: PurchaseStatus; label: string }
  supplier?: { id: number; name: string; tax_id: string | null }
  supplier_document: { number: string | null; date: string | null; stamp_number: string | null }
  condition: { value: InvoiceCondition; label: string }
  due_date: string | null
  items?: PurchaseItem[]
  /** null en un borrador sin líneas (salvo `iva_total`). */
  totals: {
    exempt: string | null
    taxed_5: string | null
    taxed_10: string | null
    iva_5: string | null
    iva_10: string | null
    iva_total: string
    total: string | null
    net_total: string | null
  }
  payment_summary: { paid_total: string; balance: string; status: InvoicePaymentStatus | null }
  /** Solo en `GET /purchases/{id}`. */
  payments?: SupplierPayment[]
  notes: string | null
  received_at: string | null
  received_by: number | null
  cancelled_at: string | null
  cancelled_by: number | null
  cancellation_reason: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export interface PurchaseInput {
  supplier_id: number | null
  /** Obligatorios para recibir. */
  supplier_document_number: string | null
  supplier_document_date: string | null
  supplier_stamp_number: string | null
  condition: InvoiceCondition
  /** Solo a crédito. */
  due_date: string | null
  notes: string | null
}

export interface PurchaseItemInput {
  part_id?: number | null
  quantity: number | null
  /** Con IVA incluido. */
  unit_cost: number | null
  tax_rate: TaxRate
}

/** Cuentas por pagar (`GET accounts-payable`): saldos a hoy por proveedor; con `supplier_id`, el detalle de sus compras. */
export interface AccountsPayable {
  as_of: string
  balance: string
  overdue: string
  not_due: string
  suppliers: {
    supplier_id: number
    name: string
    tax_id: string | null
    purchases_count: number
    balance: string
    overdue: string
    not_due: string
    oldest_due_date: string | null
    purchases?: {
      id: number
      code: string
      supplier_document_number: string | null
      supplier_document_date: string
      condition: InvoiceCondition
      due_date: string
      days_overdue: number
      total: string
      paid_total: string
      balance: string
      payment_status: InvoicePaymentStatus
    }[]
  }[]
}

export const PURCHASE_STATUS: StatusMap = {
  draft: { label: 'Borrador', color: 'secondary' },
  received: { label: 'Recibida', color: 'blue' },
  cancelled: { label: 'Anulada', color: 'red' },
}

export const purchasesApi = {
  list: (params: ListParams) => getPage<PurchaseSummary>('/purchases', params),
  show: (id: number) => getData<Purchase>(`/purchases/${id}`),
  create: (body: PurchaseInput) => postData<Purchase>('/purchases', body),
  update: (id: number, body: PurchaseInput) => patchData<Purchase>(`/purchases/${id}`, body),
  remove: (id: number) => deleteData(`/purchases/${id}`),
  addItem: (id: number, body: PurchaseItemInput) => postData<Purchase>(`/purchases/${id}/items`, body),
  updateItem: (id: number, itemId: number, body: PurchaseItemInput) => patchData<Purchase>(`/purchases/${id}/items/${itemId}`, body),
  removeItem: (id: number, itemId: number) => deleteData<Purchase>(`/purchases/${id}/items/${itemId}`),
  /** Ingresa el stock al costo sin IVA y actualiza el último costo del proveedor. */
  receive: (id: number) => postData<Purchase>(`/purchases/${id}/receive`),
  /** Revierte el stock al costo promedio. */
  cancel: (id: number, reason: string) => postData<Purchase>(`/purchases/${id}/cancel`, { reason }),
  accountsPayable: (supplierId?: number) => getData<AccountsPayable>('/accounts-payable', { supplier_id: supplierId }),
}
