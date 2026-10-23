import type { StatusMap } from '@/components/ui/StatusBadge'
import { getData, getPage, getWithMeta, patchData, postData } from '@/services/api'
import type { ListParams, Pagination } from '@/types/api'

export type InternalNotificationType =
  | 'budget_approved'
  | 'budget_rejected'
  | 'work_order_completed'
  | 'part_out_of_stock'
  | 'accounts_payable_overdue'

/** `UserNotificationResource`: aviso interno de la bandeja del usuario. */
export interface UserNotification {
  id: string
  type: { value: InternalNotificationType; label: string | null }
  title: string | null
  message: string | null
  /** Documento que lo originó; las cuentas por pagar vencidas no tienen. */
  subject: { type: 'budget' | 'work_order'; id: number; code: string | null } | null
  read_at: string | null
  created_at: string
}

export interface InboxMeta {
  pagination: Pagination
  unread_count: number
}

export const INTERNAL_NOTIFICATION_TYPES: Record<InternalNotificationType, string> = {
  budget_approved: 'Presupuesto aprobado',
  budget_rejected: 'Presupuesto rechazado',
  work_order_completed: 'Orden de trabajo completada',
  part_out_of_stock: 'Repuesto sin stock',
  accounts_payable_overdue: 'Cuentas por pagar vencidas',
}

/** Pantalla del documento que originó el aviso (cuentas por pagar no tiene documento propio). */
export function internalNotificationLink(notification: UserNotification): string | null {
  if (notification.subject?.type === 'budget') return `/budgets/${notification.subject.id}`
  if (notification.subject?.type === 'work_order') return `/work-orders/${notification.subject.id}`
  if (notification.type.value === 'accounts_payable_overdue') return '/accounts-payable'
  return null
}

export type ClientNotificationType =
  | 'budget_sent'
  | 'vehicle_ready'
  | 'invoice_due_soon'
  | 'invoice_overdue'
  | 'maintenance_due_soon'
  | 'maintenance_overdue'

export type ClientNotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped'

/** Alias del morph map del backend para el documento del aviso. */
export type ClientNotificationSubjectType = 'budget' | 'reception' | 'invoice' | 'vehicle_maintenance'

/** `ClientNotificationResource` (listado). */
export interface ClientNotification {
  id: number
  client_id: number
  client_name?: string
  type: { value: ClientNotificationType; label: string }
  channel: { value: string; label: string }
  subject: { type: ClientNotificationSubjectType; id: number }
  recipient: string | null
  status: { value: ClientNotificationStatus; label: string }
  /** Motivo de `skipped` o error de `failed`. */
  error: string | null
  sent_at: string | null
  resent_from_id: number | null
  created_at: string
}

/** `ShowClientNotificationResource` (detalle y reenvío). */
export interface ClientNotificationDetail extends Omit<ClientNotification, 'client_id' | 'client_name' | 'subject'> {
  client: {
    id: number
    full_name: string
    email: string | null
    phone: string | null
    notifications_enabled: boolean
  } | null
  subject: { type: ClientNotificationSubjectType; id: number; code: string | null }
  attempts: number
  created_by: { id: number; name: string } | null
  updated_at: string
}

export const CLIENT_NOTIFICATION_TYPES: Record<ClientNotificationType, string> = {
  budget_sent: 'Presupuesto enviado',
  vehicle_ready: 'Vehículo listo',
  invoice_due_soon: 'Factura por vencer',
  invoice_overdue: 'Factura vencida',
  maintenance_due_soon: 'Mantenimiento próximo',
  maintenance_overdue: 'Mantenimiento vencido',
}

export const CLIENT_NOTIFICATION_STATUS: StatusMap = {
  pending: { label: 'Pendiente', color: 'yellow' },
  sent: { label: 'Enviado', color: 'green' },
  failed: { label: 'Fallido', color: 'red' },
  skipped: { label: 'Omitido', color: 'secondary' },
}

/** Pantalla del documento del aviso; el mantenimiento no tiene pantalla propia por id. */
export function clientNotificationLink(subject: { type: ClientNotificationSubjectType; id: number }): string | null {
  switch (subject.type) {
    case 'budget':
      return `/budgets/${subject.id}`
    case 'reception':
      return `/receptions/${subject.id}`
    case 'invoice':
      return `/invoices/${subject.id}`
    default:
      return null
  }
}

export const SUBJECT_LABELS: Record<ClientNotificationSubjectType, string> = {
  budget: 'Presupuesto',
  reception: 'Recepción',
  invoice: 'Factura',
  vehicle_maintenance: 'Mantenimiento',
}

export const notificationsApi = {
  /** Bandeja interna: sin permiso, cada usuario ve solo sus avisos. */
  inbox: (params: ListParams) => getWithMeta<UserNotification[], InboxMeta>('/me/notifications', params),
  markAsRead: (id: string) => patchData<UserNotification>(`/me/notifications/${id}/read`),
  markAllAsRead: () => postData<{ marked_count: number }>('/me/notifications/read-all'),

  clientList: (params: ListParams) => getPage<ClientNotification>('/client-notifications', params),
  forClient: (clientId: number, params: ListParams) => getPage<ClientNotification>(`/clients/${clientId}/notifications`, params),
  clientShow: (id: number) => getData<ClientNotificationDetail>(`/client-notifications/${id}`),
  resend: (id: number) => postData<ClientNotificationDetail>(`/client-notifications/${id}/resend`),
}
