import { useQuery } from '@tanstack/react-query'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

/** Rol con todos los permisos (`Gate::before`): no se elimina ni se renombra (`ROLE_PROTECTED`). */
export const ADMINISTRATOR_ROLE = 'administrador'

/** `RolesResource` (listado). */
export interface RoleListItem {
  id: number
  name: string
  description: string | null
  guard_name: string
}

/** `ShowRoleResource`: los permisos llegan como IDs, pero el alta y la edición los piden por nombre. */
export interface RoleDetail extends RoleListItem {
  permissions: number[]
}

/** `GET roles/permissions-grouped-by-module`: módulo = prefijo del nombre (`clients.index` → `clients`). */
export interface PermissionGroup {
  module: string
  list: { id: number; name: string }[]
}

export interface RoleInput {
  name: string
  description: string
  guard_name: 'api'
  /** Nombres de permisos; en la edición, sin este campo no cambian. */
  permissions?: string[]
}

export const rolesApi = {
  list: (params: ListParams) => getPage<RoleListItem>('/roles', params),
  show: (id: number) => getData<RoleDetail>(`/roles/${id}`),
  create: (body: RoleInput) => postData<RoleDetail>('/roles', body),
  update: (id: number, body: RoleInput) => patchData<RoleDetail>(`/roles/${id}`, body),
  remove: (id: number) => deleteData(`/roles/${id}`),
  permissionsByModule: () => getData<PermissionGroup[]>('/roles/permissions-grouped-by-module'),
}

/** Todos los roles, para el select del usuario (son pocos). */
export function useAllRoles(enabled = true) {
  return useQuery({
    queryKey: ['roles', 'all'],
    queryFn: async () => (await rolesApi.list({ per_page: 100 })).items,
    enabled,
    staleTime: 5 * 60_000,
  })
}

/** Módulos de permisos (prefijo de `<recurso>.<acción>`, según `RolesAndPermissionsSeeder`); otro se muestra tal cual. */
export const PERMISSION_MODULES: Record<string, string> = {
  users: 'Usuarios',
  permissions: 'Permisos',
  roles: 'Roles',
  clients: 'Clientes',
  brands: 'Marcas',
  vehicle_models: 'Modelos de vehículo',
  vehicles: 'Vehículos',
  checklists: 'Ítems de checklist',
  receptions: 'Recepciones',
  'reception-check-lists': 'Checklist de la recepción',
  'receptions-photos': 'Fotos de la recepción',
  diagnostics: 'Diagnósticos',
  'diagnostic-items': 'Ítems de diagnóstico',
  'diagnostic-item-photos': 'Fotos del diagnóstico',
  budgets: 'Presupuestos',
  'budget-items': 'Ítems de presupuesto',
  mechanics: 'Mecánicos',
  'work-orders': 'Órdenes de trabajo',
  'work-order-items': 'Trabajos de la OT',
  'work-order-parts': 'Repuestos en la OT',
  'work-order-item-mechanics': 'Mecánicos y horas de la OT',
  'mechanic-commissions': 'Comisiones',
  'part-categories': 'Categorías de repuestos',
  suppliers: 'Proveedores',
  parts: 'Repuestos',
  'service-categories': 'Categorías de servicios',
  services: 'Servicios',
  inventory: 'Inventario',
  purchases: 'Compras',
  'supplier-payments': 'Pagos a proveedores',
  'accounts-payable': 'Cuentas por pagar',
  'invoice-stamps': 'Timbrados',
  invoices: 'Facturas',
  payments: 'Cobros',
  'vehicle-deliveries': 'Entregas',
  'vehicle-history': 'Historial del vehículo',
  'maintenance-plans': 'Planes de mantenimiento',
  'vehicle-maintenances': 'Mantenimiento por vehículo',
  'maintenance-alerts': 'Alertas de mantenimiento',
  'client-notifications': 'Avisos a clientes',
  dashboard: 'Dashboard',
  reports: 'Reportes',
  'audit-logs': 'Auditoría',
}

/** Acciones de los permisos; otra se muestra tal cual (el nombre completo va en el `title`). */
export const PERMISSION_ACTIONS: Record<string, string> = {
  index: 'Listar',
  show: 'Ver',
  view: 'Ver',
  store: 'Crear',
  update: 'Editar',
  destroy: 'Eliminar',
  cancel: 'Cancelar o anular',
  'change-status': 'Cambiar estado',
  send: 'Enviar',
  approve: 'Aprobar',
  reject: 'Rechazar',
  reopen: 'Reabrir',
  start: 'Iniciar',
  pause: 'Pausar',
  resume: 'Reanudar',
  complete: 'Completar',
  'view-economics': 'Ver costos y margen',
  reserve: 'Reservar',
  consume: 'Consumir',
  return: 'Devolver',
  'manage-suppliers': 'Gestionar proveedores',
  sync: 'Asignar mecánicos',
  'log-hours': 'Cargar horas propias',
  'log-hours-any': 'Cargar horas de todos',
  'view-all': 'Ver las de todos',
  settle: 'Liquidar',
  issue: 'Emitir',
  summary: 'Resumen',
  record: 'Registrar',
  configure: 'Configurar intervalos',
  entry: 'Registrar entradas',
  exit: 'Registrar salidas',
  adjust: 'Ajustar por conteo',
  receive: 'Recibir',
  resend: 'Reenviar',
  'permissions-grouped-by-module': 'Ver permisos por módulo',
  sales: 'Ventas',
  budgets: 'Presupuestos',
  profitability: 'Rentabilidad',
  productivity: 'Productividad',
  inventory: 'Inventario',
  clients: 'Clientes',
}
