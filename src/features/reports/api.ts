import type { BudgetStatus } from '@/features/budgets/api'
import type { InvoiceCondition } from '@/features/invoices/api'
import type { CashSummary } from '@/features/payments/api'
import { downloadFile, getData } from '@/services/api'

interface Period {
  date_from: string
  date_to: string
}

/** `GET /dashboard`: el bloque taller siempre; el resto según el permiso de su reporte. Mes en curso. */
export interface Dashboard {
  workshop: {
    vehicles_in_shop: number
    open_work_orders: { pending: number; in_progress: number; paused: number }
    completed_this_month: number
  }
  /** Con IVA. */
  sales?: { invoiced_this_month: string; collected_this_month: string; receivables: string }
  budgets?: { awaiting_response: number; awaiting_response_total: string; approval_rate_this_month: string | null }
  /** Sin IVA. */
  profitability?: { gross_margin_this_month: string; margin_percentage_this_month: string | null }
  productivity?: { jobs_completed_this_month: number }
  inventory?: { stock_value: string; below_minimum: number }
  maintenance?: { overdue: number; due_soon: number }
}

/** Facturas emitidas por fecha de emisión (con IVA) y cobros del período. */
export interface SalesReport {
  period: Period
  totals: {
    invoices_count: number
    total: string
    exempt: string
    taxed_5: string
    taxed_10: string
    iva_5: string
    iva_10: string
    discount: string
    average_ticket: string
  }
  /** `period` es `YYYY-MM-DD` o `YYYY-MM` según `group_by`. */
  by_period: { period: string; invoices_count: number; total: string }[]
  by_condition: { condition: InvoiceCondition; invoices_count: number; total: string }[]
  collected: Pick<CashSummary, 'total' | 'payments_count' | 'by_method'>
  cancelled: { invoices_count: number; total: string }
  /** Notas de crédito registradas en el período, por su fecha (P10). `totals.total` sigue siendo lo emitido. */
  credit_notes?: { credit_notes_count: number; total: string; iva_5: string; iva_10: string }
  /** Emitido menos lo acreditado en el período. */
  net_total?: string
}

/** Presupuestos creados en el período, por su estado actual. */
export interface BudgetsReport {
  period: Period
  budgets_count: number
  total: string
  by_status: { status: BudgetStatus; budgets_count: number; total: string }[]
  /** Aprobados / (aprobados + rechazados); null sin respuestas. */
  approval_rate: string | null
}

interface MarginRow {
  work_order_id: number
  work_order_code: string | null
  sale_total: string
  gross_margin: string
  margin_percentage: string
  is_cost_complete: boolean
}

/** Cierres económicos del período (sin IVA). */
export interface ProfitabilityReport {
  period: Period
  totals: {
    work_orders_count: number
    sale_labor: string
    sale_parts: string
    sale_total: string
    cost_parts: string
    cost_labor: string
    commission_total: string
    cost_total: string
    gross_margin: string
    margin_percentage: string | null
    incomplete_cost_count: number
  }
  lowest_margin: MarginRow[]
  highest_margin: MarginRow[]
}

/** Por mecánico, sobre las OT completadas en el período (sin IVA). */
export interface ProductivityReport {
  period: Period
  mechanics: {
    mechanic_id: number
    employee_code: string
    full_name: string
    work_orders_as_responsible: number
    jobs_completed: number
    labor_sale_attributed: string
    commission_total: string
    hours_logged: string
    labor_cost: string
  }[]
}

/** Valor del stock y bajo mínimo a hoy; consumo y movimientos del período. */
export interface InventoryReport {
  period: Period
  stock_value: string
  below_minimum: {
    part_id: number
    part_code: string
    name: string
    minimum_stock: string
    quantity_on_hand: string
    quantity_available: string
  }[]
  top_consumed: { part_id: number; part_code: string | null; name: string | null; quantity: string; cost: string }[]
  movements_by_type: { type: string; movements_count: number; quantity: string; total_cost: string }[]
}

/** Facturación por cliente y nuevos (período, con IVA); saldos por cobrar a hoy; vehículos con más visitas. */
export interface ClientsReport {
  period: Period
  new_clients: number
  top_clients: { client_id: number; full_name: string | null; invoices_count: number; total: string }[]
  receivables: {
    total: string
    clients: {
      client_id: number
      full_name: string | null
      phone: string | null
      invoices_count: number
      balance: string
      oldest_due_date: string | null
      /** Aseguradora o cliente (M11). */
      recipient_type?: RecipientType
      recipient_label?: string
    }[]
  }
  top_vehicles: { vehicle_id: number; plate: string | null; visits: number }[]
}

/** `insurer`: el cliente de la factura es el de una aseguradora (también dada de baja); si no, `customer`. */
export type RecipientType = 'insurer' | 'customer'

/** Saldo, vencido y antigüedad por días de atraso (con IVA). */
export interface ReceivableTotals {
  invoices_count: number
  balance: string
  overdue: string
  not_overdue: string
  days_1_30: string
  days_31_60: string
  days_61_90: string
  days_over_90: string
}

/** Cuentas por cobrar a hoy (M11): facturas emitidas con saldo; vence en `due_date` o, al contado, en la emisión. */
export interface ReceivablesReport {
  as_of: string
  totals: ReceivableTotals
  by_recipient: (ReceivableTotals & { recipient_type: RecipientType; recipient_label: string })[]
  clients: {
    client_id: number
    full_name: string | null
    document_number: string | null
    recipient_type: RecipientType
    recipient_label: string
    invoices_count: number
    balance: string
    overdue: string
    oldest_due_date: string
    max_days_overdue: number
  }[]
  /** Solo con `client_id`. */
  invoices?: {
    invoice_id: number
    number: string | null
    issue_date: string
    condition: string
    due_date: string
    days_overdue: number
    work_order_code: string | null
    claim_code: string | null
    total: string
    paid_total: string
    credited_total: string
    balance: string
  }[]
}

/** Fila del reporte de siniestros: sin IVA hasta el reparto; facturado, cobrado y saldo con IVA. */
export interface ClaimsReportRow {
  claim_id: number
  code: string
  claim_number: string | null
  insurer_name: string | null
  status: string
  loss_date: string
  plate: string | null
  deductible_amount: string | null
  budgeted_insurer: string
  authorized_total: string
  accepted_owner_amount: string
  allocated_insurer: string
  allocated_owner: string
  allocated_workshop: string
  invoiced_insurer: string
  collected_insurer: string
  balance_insurer: string
  invoiced_customer: string
  collected_customer: string
  balance_customer: string
  alerts_count: number
}

type ClaimsReportAmount = Exclude<
  keyof ClaimsReportRow,
  'claim_id' | 'code' | 'claim_number' | 'insurer_name' | 'status' | 'loss_date' | 'plate' | 'deductible_amount' | 'alerts_count'
>

/** Siniestros con la fecha del siniestro en el período (M11). */
export interface ClaimsReport {
  period: Period
  totals: { claims_count: number } & Record<ClaimsReportAmount, string>
  claims: ClaimsReportRow[]
}

export type ReportKey = 'sales' | 'budgets' | 'profitability' | 'productivity' | 'inventory' | 'clients' | 'receivables' | 'claims'

/** Sin fechas, el backend toma el mes en curso. Cada reporte acepta solo sus filtros (`reportParams`). */
export interface ReportParams {
  date_from?: string
  date_to?: string
  group_by?: 'day' | 'month'
  recipient_type?: RecipientType
  client_id?: number
  insurer_id?: number
  status?: 'open' | 'closed' | 'cancelled'
}

/** Estado de los filtros de la pantalla de reportes ('' = sin filtro). */
export interface ReportFilters {
  date_from: string
  date_to: string
  group_by: 'day' | 'month'
  recipient_type: RecipientType | ''
  client_id: number | null
  insurer_id: string
  status: '' | 'open' | 'closed' | 'cancelled'
}

/**
 * Parámetros del reporte activo, sin los filtros vacíos ni los de otros reportes: cuentas por cobrar es a hoy (sin
 * fechas) y filtra por destinatario y cliente; siniestros, por aseguradora y estado; ventas agrupa por día o mes.
 */
export function reportParams(report: ReportKey, filters: ReportFilters): ReportParams {
  const params: ReportParams = {}
  if (report !== 'receivables') {
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
  }
  if (report === 'sales') params.group_by = filters.group_by
  if (report === 'receivables') {
    if (filters.recipient_type) params.recipient_type = filters.recipient_type
    if (filters.client_id !== null) params.client_id = filters.client_id
  }
  if (report === 'claims') {
    if (filters.insurer_id) params.insurer_id = Number(filters.insurer_id)
    if (filters.status) params.status = filters.status
  }
  return params
}

export const reportsApi = {
  dashboard: () => getData<Dashboard>('/dashboard'),
  sales: (params: ReportParams) => getData<SalesReport>('/reports/sales', { ...params }),
  budgets: (params: ReportParams) => getData<BudgetsReport>('/reports/budgets', { ...params }),
  profitability: (params: ReportParams) => getData<ProfitabilityReport>('/reports/profitability', { ...params }),
  productivity: (params: ReportParams) => getData<ProductivityReport>('/reports/productivity', { ...params }),
  inventory: (params: ReportParams) => getData<InventoryReport>('/reports/inventory', { ...params }),
  clients: (params: ReportParams) => getData<ClientsReport>('/reports/clients', { ...params }),
  receivables: (params: ReportParams) => getData<ReceivablesReport>('/reports/receivables', { ...params }),
  claims: (params: ReportParams) => getData<ClaimsReport>('/reports/claims', { ...params }),
  download: (report: ReportKey, format: 'csv' | 'pdf', params: ReportParams) =>
    downloadFile(`/reports/${report}`, `reporte-${report}.${format}`, { ...params, format }),
}
