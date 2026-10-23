import type { BudgetStatus, BudgetItemType } from '@/features/budgets/api'
import type { DiagnosticItemStatus, Priority, Severity } from '@/features/diagnostics/api'
import type { InvoiceStatus, InvoicePaymentStatus } from '@/features/invoices/api'
import type { FuelLevel, ReceptionStatus } from '@/features/receptions/api'
import type { WorkOrderItemStatus, WorkOrderStatus } from '@/features/work-orders/api'
import { getData, getPage, getWithMeta } from '@/services/api'
import type { ListParams, Pagination } from '@/types/api'

/** `GET vehicles/{id}/history`: vehículo, resumen y una entrada por recepción (de la más reciente a la más antigua). */
export interface VehicleHistory {
  vehicle: {
    id: number
    plate: string | null
    chassis: string | null
    brand: string | null
    model: string | null
    year: number | null
    mileage: number | null
    client: { id: number; full_name: string } | null
  }
  summary: {
    visits: number
    first_visit: string | null
    last_visit: string | null
    last_mileage: number | null
    work_orders_completed: number
    last_service_at: string | null
    /** Facturas emitidas, con IVA. */
    invoiced_total: string
    balance_due: string
    /** Solo con `work-orders.view-economics`; sin IVA. */
    economics?: { sale_total: string; cost_total: string; gross_margin: string }
  }
  timeline: HistoryEntry[]
}

export interface HistoryEntry {
  reception_id: number
  reception_date: string
  status: ReceptionStatus
  mileage_in: number | null
  fuel_level: FuelLevel | null
  problem_description: string | null
  service_categories: string[]
  diagnostics: {
    id: number
    diagnosed_at: string
    diagnosis: string | null
    recommendation: string | null
    priority: Priority
    findings: { title: string; severity: Severity; status: DiagnosticItemStatus }[]
  }[]
  budgets: { id: number; code: string; status: BudgetStatus; total: string }[]
  work_orders: {
    id: number
    code: string
    status: WorkOrderStatus
    completed_at: string | null
    mechanic: string | null
    jobs: { description: string; type: BudgetItemType; status: WorkOrderItemStatus }[]
    parts_used: { part_code: string | null; name: string | null; quantity: string }[]
    invoice: { number: string | null; status: InvoiceStatus; total: string; balance: string; payment_status: InvoicePaymentStatus | null } | null
    /** Solo con `work-orders.view-economics`; sin IVA. */
    economics?: { sale_total: string; cost_total: string; gross_margin: string; is_cost_complete: boolean }
  }[]
  delivery: { delivery_number: string; delivered_at: string; mileage_out: number; received_by: string } | null
}

/** Repuesto usado (cantidad neta > 0). Precios sin IVA; costos solo con `work-orders.view-economics`. */
export interface HistoryPart {
  used_at: string | null
  work_order_id: number
  work_order_code: string | null
  part_id: number
  part_code: string | null
  name: string | null
  brand: string | null
  quantity: string
  unit_price: string
  total_price: string
  unit_cost?: string | null
  total_cost?: string | null
}

/** Lectura de kilometraje (ingresos y entregas, en orden). `decreased`: menor que la anterior (posible error de carga). */
export interface MileageReading {
  date: string
  mileage: number
  source: 'reception' | 'delivery'
  reference_id: number
  decreased: boolean
}

export const vehicleHistoryApi = {
  show: async (vehicleId: number, params: ListParams) => {
    const { data, meta } = await getWithMeta<VehicleHistory, { pagination: Pagination }>(`/vehicles/${vehicleId}/history`, params)
    return { ...data, pagination: meta.pagination }
  },
  parts: (vehicleId: number, params: ListParams) => getPage<HistoryPart>(`/vehicles/${vehicleId}/history/parts`, params),
  mileage: (vehicleId: number) => getData<MileageReading[]>(`/vehicles/${vehicleId}/history/mileage`),
}
