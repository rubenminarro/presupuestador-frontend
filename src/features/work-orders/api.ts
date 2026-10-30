import type { StatusMap } from '@/components/ui/StatusBadge'
import type { Budget } from '@/features/budgets/api'
import type { InvoiceCondition, InvoicePaymentStatus, InvoiceStatus } from '@/features/invoices/api'
import type { Mechanic } from '@/features/mechanics/api'
import type { PartUnit } from '@/features/parts/api'
import type { ReceptionSummary } from '@/features/receptions/api'
import { getData, getPage, patchData, postData, postWithMeta, putData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type WorkOrderStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
export type WorkOrderItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type WorkOrderPartStatus = 'awaiting_approval' | 'pending' | 'reserved' | 'consumed' | 'returned' | 'cancelled'
export type ClientDecisionChannel = 'phone' | 'whatsapp' | 'in_person' | 'email' | 'other'

/** Factura vigente de la OT (`ShowWorkOrderResource::invoices`). Importes con IVA, en guaraníes. */
export interface WorkOrderInvoiceSummary {
  id: number
  number: string | null
  status: { value: InvoiceStatus; label: string }
  client_id: number | null
  customer_name: string
  condition: InvoiceCondition | null
  allocation_id: number | null
  total: string
  balance: string
  payment_status: InvoicePaymentStatus | null
}

export type WorkOrderInvoiceRow = Pick<WorkOrderInvoiceSummary, 'id' | 'number' | 'status' | 'total'> &
  Partial<Pick<WorkOrderInvoiceSummary, 'customer_name' | 'balance' | 'payment_status'>>

/** Facturas de la OT: `invoices` (M9); si solo llega la clave heredada `invoice`, esa. */
export function workOrderInvoices(workOrder: { invoices?: WorkOrderInvoiceSummary[]; invoice?: WorkOrderInvoiceRow | null }): WorkOrderInvoiceRow[] {
  if (workOrder.invoices) return workOrder.invoices
  return workOrder.invoice ? [workOrder.invoice] : []
}

/** Respuesta del cliente a un repuesto extra. `decided_by` es el id del usuario que la registró. */
export interface ClientDecision {
  value: 'approved' | 'rejected'
  label: string
  decided_at: string
  decided_by: number
  channel: { value: ClientDecisionChannel; label: string }
  contact: string | null
  notes: string | null
}

export interface ItemMechanic {
  id: number
  work_order_item_id: number
  mechanic_id: number
  mechanic?: { id: number; employee_code: string; full_name: string; user_id: number }
  /** Decimales como string. */
  share_percentage: string
  commission_percentage: string | null
  commission_amount: string | null
  hours: string | null
  hour_cost: string | null
  /** null: sin horas cargadas (costo desconocido, nunca cero). */
  labor_cost: string | null
}

export interface WorkOrderItem {
  id: number
  work_order_id: number
  budget_item_id: number
  type: { value: 'labor' | 'service' | 'part'; label: string }
  description: string
  quantity: string
  estimated_hours?: string | null
  status: { value: WorkOrderItemStatus; label: string }
  notes: string | null
  mechanics?: ItemMechanic[]
}

export interface WorkOrderPart {
  id: number
  work_order_id: number
  work_order_item_id: number | null
  /** false: agregado en la OT, fuera del presupuesto. */
  is_budgeted: boolean
  part_id: number
  part?: { id: number; code: string; name: string; unit: { value: PartUnit; label: string } }
  status: { value: WorkOrderPartStatus; label: string }
  quantity: string
  quantity_consumed: string | null
  quantity_returned: string | null
  quantity_net: string
  /** Costo del consumo (sin IVA); null hasta consumir. */
  unit_cost: string | null
  /** Sin IVA. */
  unit_price: string
  total_cost: string | null
  total_price: string
  /** Solo en extras, una vez registrada la respuesta del cliente. */
  client_decision: ClientDecision | null
  notes: string | null
}

export interface EconomicSummary {
  is_final: boolean
  closed_at: string | null
  budgeted: { labor: string; parts: string; total: string }
  sale: { labor: string; parts: string; total: string }
  variance: string
  cost: { parts: string; labor: string; commissions: string; total: string }
  gross_margin: string
  margin_percentage: string | null
  is_cost_complete: boolean
}

/** `WorkOrderResource`; el detalle (`ShowWorkOrderResource`) suma ítems, repuestos y resúmenes. */
export interface WorkOrder {
  id: number
  code: string
  reception_id: number
  budget_id: number
  mechanic_id: number
  created_by: number
  status: { value: WorkOrderStatus; label: string }
  started_at: string | null
  completed_at: string | null
  notes: string | null
  reception?: ReceptionSummary
  budget?: Budget
  mechanic?: Mechanic
  creator?: { id: number; name: string; first_name: string; last_name: string }
  items?: WorkOrderItem[]
  parts?: WorkOrderPart[]
  labor_summary?: {
    /** null sin horas estimadas / cargadas. */
    estimated_hours: string | null
    actual_hours: string | null
    labor_cost: string | null
    assignments_without_hours: number
    assignments_without_cost: number
    is_complete: boolean
  }
  commission_summary?: {
    is_final: boolean
    total_commission: string
    by_mechanic: { mechanic_id: number; employee_code: string; full_name: string; commission_amount: string }[]
  }
  parts_summary?: { total_cost: string; total_price: string; unresolved_count: number }
  /** Solo con `invoices.show`. Clave heredada: la última factura vigente; usar `invoices`. */
  invoice?: { id: number; number: string | null; status: { value: InvoiceStatus; label: string }; total: string } | null
  /** Facturas vigentes (borrador o emitida): una por responsable si la OT tiene reparto (M9). Solo con `invoices.show`. */
  invoices?: WorkOrderInvoiceSummary[]
  invoices_count?: number
  /** El presupuesto tiene líneas de la aseguradora y la recepción un siniestro: se factura por responsable (M8–M9). */
  requires_allocation?: boolean
  /** La recepción tiene un siniestro abierto (M7, P5): un extra queda a cargo del dueño. */
  has_claim?: boolean
  /**
   * Advertencia de B (M7), solo con `claims.show`: la parte potencial del dueño supera lo que aceptó, o subió el
   * deducible desde su aceptación. Informativa; null si no hay nada que advertir.
   */
  owner_amount_warning?: {
    accepted_amount: string
    potential_amount: string
    difference: string
    amount_exceeded: boolean
    accepted_deductible: string | null
    current_deductible: string | null
    deductible_increased: boolean
    message: string
  } | null
  /** Solo con `work-orders.view-economics`. */
  economic_summary?: EconomicSummary
  created_at: string
  updated_at: string
}

export interface WorkOrderPartInput {
  part_id?: number | null
  /** Obligatoria en el alta; en un extra aprobado no se envía (no cambia). */
  quantity?: number | null
  /** Vacío en el alta: precio de venta del repuesto. */
  unit_price?: number | null
  notes: string | null
}

export const WORK_ORDER_STATUS: StatusMap = {
  pending: { label: 'Pendiente', color: 'yellow' },
  in_progress: { label: 'En reparación', color: 'blue' },
  paused: { label: 'Pausada', color: 'orange' },
  completed: { label: 'Terminada', color: 'green' },
  cancelled: { label: 'Cancelada', color: 'secondary' },
}

export const WORK_ORDER_ITEM_STATUS: StatusMap = {
  pending: { label: 'Pendiente', color: 'yellow' },
  in_progress: { label: 'En curso', color: 'blue' },
  completed: { label: 'Terminado', color: 'green' },
  cancelled: { label: 'Cancelado', color: 'secondary' },
}

export interface ClientDecisionInput {
  channel: ClientDecisionChannel | ''
  contact: string | null
  /** Obligatorio al rechazar (motivo). */
  notes: string | null
}

export const CLIENT_DECISION_CHANNELS: Record<ClientDecisionChannel, string> = {
  phone: 'Teléfono',
  whatsapp: 'WhatsApp',
  in_person: 'Presencial',
  email: 'Email',
  other: 'Otro',
}

export const WORK_ORDER_PART_STATUS: StatusMap = {
  awaiting_approval: { label: 'Pendiente de aprobación', color: 'orange' },
  pending:{ label: 'Sin stock reservado', color: 'yellow' },
  reserved: { label: 'Reservado', color: 'blue' },
  consumed: { label: 'Consumido', color: 'green' },
  returned: { label: 'Devuelto', color: 'secondary' },
  cancelled: { label: 'Cancelado', color: 'secondary' },
}

export type WorkOrderAction = 'start' | 'pause' | 'resume' | 'complete' | 'cancel'
export type ItemAction = 'start' | 'complete' | 'cancel'

export const workOrdersApi = {
  list: (params: ListParams) => getPage<WorkOrder>('/work-orders', params),
  show: (id: number) => getData<WorkOrder>(`/work-orders/${id}`),
  /** `internalExceptionId`: excepción "iniciar sin autorización" que se consume (M7; presupuesto con aseguradora sin autorizar). */
  create: (budgetId: number, mechanicId: number | null, internalExceptionId: number | null = null) =>
    postData<WorkOrder>('/work-orders', {
      budget_id: budgetId,
      mechanic_id: mechanicId,
      ...(internalExceptionId !== null && { internal_exception_id: internalExceptionId }),
    }),
  update: (id: number, body: { mechanic_id?: number | null; notes: string | null }) => patchData<WorkOrder>(`/work-orders/${id}`, body),
  action: (id: number, action: WorkOrderAction) => postData<WorkOrder>(`/work-orders/${id}/${action}`),
  itemAction: (id: number, itemId: number, action: ItemAction) => postData<WorkOrder>(`/work-orders/${id}/items/${itemId}/${action}`),
  /** Sin porcentajes: partes iguales; con porcentajes: todos y suman 100. */
  syncMechanics: (id: number, itemId: number, mechanics: { mechanic_id: number; share_percentage: number | null }[]) =>
    putData<ItemMechanic[]>(`/work-orders/${id}/items/${itemId}/mechanics`, { mechanics }),
  /** null borra las horas. */
  logHours: (id: number, itemId: number, mechanicId: number, hours: number | null) =>
    patchData<ItemMechanic>(`/work-orders/${id}/items/${itemId}/mechanics/${mechanicId}/hours`, { hours }),
  /** Extra; con siniestro abierto, `meta.warnings` avisa que queda a cargo del dueño (P5). */
  addPart: (id: number, body: WorkOrderPartInput) => postWithMeta<WorkOrderPart, { warnings?: string[] }>(`/work-orders/${id}/parts`, body),
  updatePart: (id: number, lineId: number, body: WorkOrderPartInput) => patchData<WorkOrderPart>(`/work-orders/${id}/parts/${lineId}`, body),
  /** Extra `awaiting_approval`: aprobar lo pasa a `pending` e intenta reservar; rechazar lo cancela. */
  decidePart: (id: number, lineId: number, decision: 'approve' | 'reject', body: ClientDecisionInput) =>
    postData<WorkOrderPart>(`/work-orders/${id}/parts/${lineId}/${decision}`, body),
  reservePart: (id: number, lineId: number) => postData<WorkOrderPart>(`/work-orders/${id}/parts/${lineId}/reserve`),
  consumePart: (id: number, lineId: number, quantityUsed: number | null, notes: string | null) =>
    postData<WorkOrderPart>(`/work-orders/${id}/parts/${lineId}/consume`, { quantity_used: quantityUsed, notes }),
  returnPart: (id: number, lineId: number, quantity: number | null, reason: string) =>
    postData<WorkOrderPart>(`/work-orders/${id}/parts/${lineId}/return`, { quantity, reason }),
  cancelPart: (id: number, lineId: number) => postData<WorkOrderPart>(`/work-orders/${id}/parts/${lineId}/cancel`),
}
