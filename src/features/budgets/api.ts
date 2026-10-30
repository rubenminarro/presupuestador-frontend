import type { StatusMap } from '@/components/ui/StatusBadge'
import type { ReceptionSummary } from '@/features/receptions/api'
import type { ClientDecisionChannel } from '@/features/work-orders/api'
import { deleteData, downloadFile, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type BudgetStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled'
export type BudgetItemType = 'labor' | 'service' | 'part'

export interface BudgetItem {
  id: number
  budget_id: number
  type: BudgetItemType
  type_label: string
  part_id: number | null
  part?: { id: number; code: string; name: string } | null
  service_id: number | null
  service?: { id: number; code: string; name: string } | null
  description: string
  /** Decimales como string; precios sin IVA. */
  quantity: string
  unit_price: string
  total: string
  estimated_hours: string | null
  notes: string | null
  /** Quién paga la línea (M5): el dueño por defecto; la aseguradora solo con un siniestro abierto. */
  responsibility: { value: BudgetItemResponsibility; label: string }
}

export type BudgetItemResponsibility = 'owner' | 'insurer'

export const BUDGET_ITEM_RESPONSIBILITY: Record<BudgetItemResponsibility, string> = {
  owner: 'Dueño',
  insurer: 'Aseguradora',
}

/** `BudgetResource`; el detalle (`ShowBudgetResource`) suma `items`. Totales calculados por el backend. */
export interface Budget {
  id: number
  code: string
  status: BudgetStatus
  /** Sin IVA. */
  subtotal: string
  tax: string
  /** Con IVA. */
  total: string
  notes: string | null
  approved_at: string | null
  reception_id: number
  reception?: ReceptionSummary
  created_by: number
  creator?: { id: number; name: string; first_name: string; last_name: string }
  items?: BudgetItem[]
  /** Respuestas del cliente en orden (solo en el detalle). Los presupuestos anteriores a E5 no tienen. */
  client_acceptances?: BudgetClientAcceptance[]
  /** Autorización vigente de la aseguradora (M6), resumida; solo con `insurer-authorizations.show`. */
  insurer_authorization?: {
    id: number
    version: number
    result: { value: 'full' | 'partial' | 'rejected'; label: string }
    authorization_number: string | null
    decided_at: string | null
    /** Sin IVA. */
    authorized_total: string
  } | null
  created_at: string
  updated_at: string
}

/** El presupuesto tiene líneas a cargo de la aseguradora (solo con `items` cargados). */
export function hasInsurerItems(budget: Pick<Budget, 'items'>): boolean {
  return (budget.items ?? []).some((item) => item.responsibility.value === 'insurer')
}

/** Tipo de respuesta del cliente (`ClientAcceptanceKind`). */
export type ClientAcceptanceKind = 'approval' | 'rejection' | 're_acceptance'

/** `BudgetClientAcceptanceResource`: inmutable; `owner_amount` es el importe sin IVA a cargo del cliente. */
export interface BudgetClientAcceptance {
  id: number
  kind: { value: ClientAcceptanceKind; label: string }
  decided_at: string
  decided_by: { id: number; name: string } | null
  channel: { value: ClientDecisionChannel; label: string } | null
  contact: string | null
  notes: string | null
  owner_amount: string
}

/** Respuesta del cliente al aprobar o rechazar: todo opcional (sin datos se registra igual quién y cuándo). */
export interface BudgetDecisionInput {
  channel: ClientDecisionChannel | null
  contact: string | null
  notes: string | null
}

export interface BudgetItemInput {
  type?: BudgetItemType
  part_id?: number | null
  service_id?: number | null
  description: string
  quantity: number | null
  /** Vacío en un servicio del catálogo: toma su precio estándar. */
  unit_price?: number | null
  /** Vacío en un servicio del catálogo: horas del catálogo × cantidad. Prohibido en repuestos. */
  estimated_hours?: number | null
  notes: string | null
  /** Sin enviarlo la línea queda (o sigue) a cargo del dueño. `insurer` exige un siniestro abierto. */
  responsibility?: BudgetItemResponsibility
}

export const BUDGET_STATUS: StatusMap = {
  draft: { label: 'Borrador', color: 'secondary' },
  sent: { label: 'Enviado', color: 'blue' },
  approved: { label: 'Aprobado', color: 'green' },
  rejected: { label: 'Rechazado', color: 'red' },
  cancelled: { label: 'Cancelado', color: 'secondary' },
}

export const BUDGET_ITEM_TYPES: Record<BudgetItemType, string> = {
  labor: 'Mano de obra',
  service: 'Servicio',
  part: 'Repuesto',
}

export type BudgetAction = 'send' | 'approve' | 'reject' | 'reopen' | 'cancel'

export const budgetsApi = {
  list: (params: ListParams) => getPage<Budget>('/budgets', params),
  show: (id: number) => getData<Budget>(`/budgets/${id}`),
  create: (receptionId: number, notes: string | null) => postData<Budget>('/budgets', { reception_id: receptionId, notes }),
  update: (id: number, notes: string | null) => patchData<Budget>(`/budgets/${id}`, { notes }),
  remove: (id: number) => deleteData(`/budgets/${id}`),
  action: (id: number, action: BudgetAction, decision?: BudgetDecisionInput) =>
    postData<Budget>(`/budgets/${id}/${action}`, decision),
  /** Re-aceptación del dueño (M7): presupuesto aprobado; el importe lo calcula el backend. */
  reaccept: (id: number, body: { channel: ClientDecisionChannel | ''; contact: string | null; notes: string | null }) =>
    postData<BudgetClientAcceptance>(`/budgets/${id}/client-acceptances`, body),
  pdf: (budget: Pick<Budget, 'id' | 'code'>) => downloadFile(`/budgets/${budget.id}/pdf`, `presupuesto-${budget.code}.pdf`),
  createItem: (id: number, body: BudgetItemInput) => postData<BudgetItem>(`/budgets/${id}/items`, body),
  updateItem: (id: number, itemId: number, body: BudgetItemInput) => patchData<BudgetItem>(`/budgets/${id}/items/${itemId}`, body),
  removeItem: (id: number, itemId: number) => deleteData(`/budgets/${id}/items/${itemId}`),
}
