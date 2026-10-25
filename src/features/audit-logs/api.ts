import type { StatusMap } from '@/components/ui/StatusBadge'
import { getData, getPage } from '@/services/api'
import type { ListParams } from '@/types/api'

export type AuditEvent =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'restored'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'permissions_synced'
  | 'roles_synced'

/** Valores registrados: solo los campos cambiados; contraseñas y tokens llegan como `********`. */
export type AuditValues = Record<string, unknown> | null

/** `AuditLogResource` (listado). `auditable_type` es el modelo en snake_case (`budget_item`, `invoice`, …). */
export interface AuditLog {
  id: number
  event: { value: AuditEvent; label: string }
  auditable_type: string | null
  auditable_id: number | null
  /** null: usuario eliminado o evento sin sesión (login fallido). */
  user: { id: number; name: string } | null
  old_values: AuditValues
  new_values: AuditValues
  ip_address: string | null
  created_at: string
}

/** `ShowAuditLogResource`. */
export interface AuditLogDetail extends Omit<AuditLog, 'user'> {
  user: { id: number; name: string; email: string } | null
  user_agent: string | null
}

export const AUDIT_EVENTS: StatusMap = {
  created: { label: 'Creado', color: 'green' },
  updated: { label: 'Modificado', color: 'blue' },
  deleted: { label: 'Eliminado', color: 'red' },
  restored: { label: 'Restaurado', color: 'teal' },
  login: { label: 'Inicio de sesión', color: 'secondary' },
  login_failed: { label: 'Inicio de sesión fallido', color: 'orange' },
  logout: { label: 'Cierre de sesión', color: 'secondary' },
  permissions_synced: { label: 'Permisos del rol actualizados', color: 'purple' },
  roles_synced: { label: 'Roles del usuario actualizados', color: 'purple' },
}

/** Modelos con el trait `Auditable` (backend `CLAUDE.md`, 6.19); otro tipo se muestra tal cual. */
export const AUDITABLE_TYPES: Record<string, string> = {
  part: 'Repuesto',
  part_supplier: 'Proveedor del repuesto',
  service: 'Servicio',
  diagnostic_item_template: 'Ítem del catálogo de diagnóstico',
  budget_item: 'Ítem de presupuesto',
  work_order_part: 'Repuesto de la OT',
  invoice: 'Factura',
  invoice_item: 'Ítem de factura',
  invoice_stamp: 'Timbrado',
  payment: 'Cobro',
  purchase: 'Compra',
  purchase_item: 'Ítem de compra',
  supplier_payment: 'Pago a proveedor',
  client: 'Cliente',
  vehicle: 'Vehículo',
  mechanic: 'Mecánico',
  maintenance_plan: 'Plan de mantenimiento',
  user: 'Usuario',
  role: 'Rol',
  permission: 'Permiso',
}

const ENTITY_ROUTES: Record<string, string> = {
  part: '/parts',
  invoice: '/invoices',
  purchase: '/purchases',
  client: '/clients',
  vehicle: '/vehicles',
}

/** Pantalla de la entidad auditada, si tiene detalle propio (puede estar eliminada). */
export function auditableLink(log: Pick<AuditLog, 'auditable_type' | 'auditable_id'>): string | null {
  const base = log.auditable_type ? ENTITY_ROUTES[log.auditable_type] : undefined
  return base && log.auditable_id ? `${base}/${log.auditable_id}` : null
}

export function auditableLabel(log: Pick<AuditLog, 'auditable_type' | 'auditable_id'>): string {
  if (!log.auditable_type) return '—'
  const type = AUDITABLE_TYPES[log.auditable_type] ?? log.auditable_type
  return log.auditable_id ? `${type} #${log.auditable_id}` : type
}

export const auditLogsApi = {
  list: (params: ListParams) => getPage<AuditLog>('/audit-logs', params),
  show: (id: number) => getData<AuditLogDetail>(`/audit-logs/${id}`),
}
