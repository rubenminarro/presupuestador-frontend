import type { ComponentType, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconBell,
  IconBox,
  IconCalendarExclamation,
  IconCalendarStats,
  IconCar,
  IconCash,
  IconChecks,
  IconCircleCheck,
  IconClipboardPlus,
  IconFileInvoice,
  IconFileText,
  IconShoppingCartPlus,
  IconTool,
  IconTrendingUp,
  IconUserPlus,
  type IconProps,
} from '@tabler/icons-react'
import type { NavSection } from '@/app/navigation'
import { useAuth } from '@/features/auth/useAuth'
import { internalNotificationLink, type UserNotification } from '@/features/notifications/api'
import { useInboxPreview, useMarkAsRead } from '@/features/notifications/useInbox'
import type { Dashboard } from '@/features/reports/api'
import { cx } from '@/lib/cx'
import { formatGuarani, formatMoney, formatPercent, formatRelative } from '@/lib/format'
import { roleLabel } from '@/lib/roles'

type Icon = ComponentType<IconProps>

// ---------------------------------------------------------------------------------------------------------------
// Bienvenida y acciones rápidas
// ---------------------------------------------------------------------------------------------------------------

const longDate = new Intl.DateTimeFormat('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Altas frecuentes: abren el formulario del listado (`?new=1`, ver `useCreateParam`); cobrar parte de una factura. */
const QUICK_ACTIONS: { label: string; to: string; icon: Icon; permission: string }[] = [
  { label: 'Nueva recepción', to: '/receptions?new=1', icon: IconClipboardPlus, permission: 'receptions.store' },
  { label: 'Nuevo cliente', to: '/clients?new=1', icon: IconUserPlus, permission: 'clients.store' },
  { label: 'Cobrar una factura', to: '/invoices', icon: IconCash, permission: 'payments.store' },
  { label: 'Nueva compra', to: '/purchases?new=1', icon: IconShoppingCartPlus, permission: 'purchases.store' },
]

/** Saludo según la hora, fecha y rol, con las acciones rápidas que el usuario puede usar. */
export function WelcomeHeader() {
  const { user, can } = useAuth()
  const now = new Date()
  const date = longDate.format(now)
  const roles = user?.roles.map((role) => roleLabel(role.name)).join(', ')
  const actions = QUICK_ACTIONS.filter((action) => can(action.permission))

  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-lg">
            <h2 className="page-title">
              {greeting(now.getHours())}, {user?.first_name}
            </h2>
            <div className="text-secondary mt-1">
              {date.charAt(0).toUpperCase() + date.slice(1)}
              {roles && <> · {roles}</>}
            </div>
          </div>
          {actions.length > 0 && (
            <div className="col-12 col-lg-auto">
              <div className="btn-list">
                {actions.map((action, index) => (
                  <Link key={action.to} to={action.to} className={cx('btn', index === 0 ? 'btn-primary' : 'btn-outline-primary')}>
                    <action.icon size={18} className="me-2" aria-hidden="true" />
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------------------------------------------

interface StatCardProps {
  icon: Icon
  /** Color de Tabler para el ícono (`bg-<color>-lt`). */
  color: string
  label: string
  value: ReactNode
  children?: ReactNode
  /** Listado con el detalle; sin permiso, la tarjeta no enlaza. */
  to?: string | false
}

function StatCard({ icon: Icon, color, label, value, children, to }: StatCardProps) {
  const body = (
    <div className="card-body">
      <div className="d-flex align-items-center gap-3">
        <span className={`avatar avatar-md bg-${color}-lt`} aria-hidden="true">
          <Icon size={24} stroke={1.75} />
        </span>
        <div className="min-w-0">
          <div className="h2 mb-0 text-nowrap">{value}</div>
          <div className="text-secondary">{label}</div>
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )

  return (
    <div className="col-12 col-sm-6 col-xl">
      {to ? (
        <Link to={to} className="card card-link card-link-pop h-100 text-reset text-decoration-none">
          {body}
        </Link>
      ) : (
        <div className="card h-100">{body}</div>
      )}
    </div>
  )
}

/** Barra apilada de las OT abiertas por estado, con su leyenda. */
function OpenWorkOrdersBar({ pending, inProgress, paused }: { pending: number; inProgress: number; paused: number }) {
  const total = pending + inProgress + paused
  const parts = [
    { label: 'Pendientes', value: pending, color: 'bg-yellow' },
    { label: 'En reparación', value: inProgress, color: 'bg-blue' },
    { label: 'Pausadas', value: paused, color: 'bg-orange' },
  ]

  return (
    <>
      <div className="progress progress-separated progress-sm mb-2" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
        {total === 0 ? (
          <div className="progress-bar bg-secondary-lt" style={{ width: '100%' }} />
        ) : (
          parts.map((part) => part.value > 0 && <div key={part.label} className={cx('progress-bar', part.color)} style={{ width: `${(part.value / total) * 100}%` }} />)
        )}
      </div>
      <div className="d-flex flex-wrap column-gap-3 small text-secondary">
        {parts.map((part) => (
          <span key={part.label} className="d-inline-flex align-items-center gap-1 text-nowrap">
            <span className={cx('legend', part.color)} aria-hidden="true" />
            {part.value} {part.label.toLowerCase()}
          </span>
        ))}
      </div>
    </>
  )
}

/** Indicadores del mes: el taller siempre; ventas y margen solo si el usuario tiene esos reportes. */
export function HomeIndicators({ data }: { data: Dashboard }) {
  const { can } = useAuth()
  const report = (key: string) => can(`reports.${key}`) && `/reports?report=${key}`
  const { workshop, sales, profitability, productivity } = data
  const open = workshop.open_work_orders

  return (
    <div className="row row-cards mb-3">
      <StatCard icon={IconCar} color="blue" label="Vehículos en taller" value={workshop.vehicles_in_shop} to={can('receptions.index') && '/receptions'} />
      <StatCard
        icon={IconTool}
        color="orange"
        label="OT abiertas"
        value={open.pending + open.in_progress + open.paused}
        to={can('work-orders.index') && '/work-orders'}
      >
        <OpenWorkOrdersBar pending={open.pending} inProgress={open.in_progress} paused={open.paused} />
      </StatCard>
      <StatCard icon={IconCircleCheck} color="green" label="OT completadas del mes" value={workshop.completed_this_month} to={report('productivity')}>
        {productivity && <div className="small text-secondary">{productivity.jobs_completed_this_month} trabajo(s) de mecánicos</div>}
      </StatCard>
      {sales && (
        <StatCard icon={IconFileInvoice} color="azure" label="Facturado del mes" value={formatGuarani(sales.invoiced_this_month)} to={report('sales')}>
          <div className="small text-secondary">Con IVA · cobrado {formatGuarani(sales.collected_this_month)}</div>
          <div className="small text-secondary">Por cobrar {formatGuarani(sales.receivables)}</div>
        </StatCard>
      )}
      {profitability && (
        <StatCard icon={IconTrendingUp} color="purple" label="Margen bruto del mes" value={formatMoney(profitability.gross_margin_this_month)} to={report('profitability')}>
          <div className="small text-secondary">Sin IVA · {formatPercent(profitability.margin_percentage_this_month)} de la venta</div>
        </StatCard>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Requiere atención
// ---------------------------------------------------------------------------------------------------------------

interface AttentionItem {
  label: string
  count: number
  hint?: string
  icon: Icon
  /** `danger` para lo vencido o crítico, `warning` para lo que conviene atender pronto. */
  tone: 'danger' | 'warning'
  to: string | false
}

/** Lo que pide acción, con su cantidad. Cada fila llega solo si el usuario puede ver ese dato; sin pendientes, "Todo al día". */
export function AttentionCard({ data }: { data: Dashboard | undefined }) {
  const { can } = useAuth()
  const unread = useInboxPreview().data?.meta.unread_count ?? 0

  const items: AttentionItem[] = []
  if (data?.budgets) {
    items.push({
      label: 'Presupuestos sin respuesta',
      count: data.budgets.awaiting_response,
      hint: `${formatMoney(data.budgets.awaiting_response_total)} · aprobación del mes ${formatPercent(data.budgets.approval_rate_this_month)}`,
      icon: IconFileText,
      tone: 'warning',
      to: can('budgets.index') && '/budgets',
    })
  }
  if (data?.inventory) {
    items.push({
      label: 'Repuestos bajo el mínimo',
      count: data.inventory.below_minimum,
      icon: IconBox,
      tone: 'danger',
      to: can('reports.inventory') && '/reports?report=inventory',
    })
  }
  if (data?.maintenance) {
    items.push(
      { label: 'Mantenimientos vencidos', count: data.maintenance.overdue, icon: IconCalendarExclamation, tone: 'danger', to: '/maintenance/alerts' },
      { label: 'Mantenimientos por vencer', count: data.maintenance.due_soon, icon: IconCalendarStats, tone: 'warning', to: '/maintenance/alerts' },
    )
  }
  items.push({ label: 'Avisos sin leer', count: unread, icon: IconBell, tone: 'warning', to: '/notifications' })

  const pending = items.filter((item) => item.count > 0)

  return (
    <div className="card h-100">
      <div className="card-header">
        <h3 className="card-title d-flex align-items-center gap-2">
          <IconAlertTriangle size={20} className="text-warning" aria-hidden="true" />
          Requiere atención
        </h3>
      </div>
      {pending.length === 0 ? (
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
          <span className="avatar avatar-lg bg-green-lt mb-3" aria-hidden="true">
            <IconChecks size={28} />
          </span>
          <div className="h3 mb-1">Todo al día</div>
          <div className="text-secondary">No hay pendientes que necesiten tu atención.</div>
        </div>
      ) : (
        <div className="list-group list-group-flush">
          {pending.map((item) => {
            const content = (
              <div className="d-flex align-items-center gap-3">
                <span className={`avatar avatar-sm bg-${item.tone === 'danger' ? 'red' : 'yellow'}-lt`} aria-hidden="true">
                  <item.icon size={18} />
                </span>
                <div className="flex-fill min-w-0">
                  <div>{item.label}</div>
                  {item.hint && <div className="small text-secondary text-truncate">{item.hint}</div>}
                </div>
                <span className={`badge bg-${item.tone === 'danger' ? 'red' : 'yellow'} text-${item.tone === 'danger' ? 'red' : 'yellow'}-fg`}>{item.count}</span>
              </div>
            )
            return item.to ? (
              <Link key={item.label} to={item.to} className="list-group-item list-group-item-action">
                {content}
              </Link>
            ) : (
              <div key={item.label} className="list-group-item">
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Últimos avisos
// ---------------------------------------------------------------------------------------------------------------

/** Los 5 avisos internos más recientes (misma consulta que la campana). Abrir uno lo marca leído. */
export function RecentNotifications() {
  const navigate = useNavigate()
  const query = useInboxPreview()
  const markAsRead = useMarkAsRead()
  const notifications = query.data?.data.slice(0, 5) ?? []

  function open(notification: UserNotification) {
    if (!notification.read_at) markAsRead.mutate(notification.id)
    const link = internalNotificationLink(notification)
    if (link) navigate(link)
  }

  return (
    <div className="card h-100">
      <div className="card-header">
        <h3 className="card-title d-flex align-items-center gap-2">
          <IconBell size={20} className="text-secondary" aria-hidden="true" />
          Últimos avisos
        </h3>
        <div className="card-actions">
          <Link to="/notifications">Ver todos</Link>
        </div>
      </div>
      {!query.data ? (
        <div className="card-body text-secondary">{query.error ? 'No se pudieron cargar los avisos.' : 'Cargando…'}</div>
      ) : notifications.length === 0 ? (
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
          <span className="avatar avatar-lg bg-secondary-lt mb-3" aria-hidden="true">
            <IconBell size={28} />
          </span>
          <div className="h3 mb-1">Sin avisos</div>
          <div className="text-secondary">Acá vas a ver los avisos del taller que te lleguen.</div>
        </div>
      ) : (
        <div className="list-group list-group-flush">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className="list-group-item list-group-item-action text-start"
              onClick={() => open(notification)}
            >
              <div className="d-flex gap-3">
                <span
                  className={cx('status-dot mt-2 flex-shrink-0', notification.read_at ? 'bg-secondary-lt' : 'status-dot-animated bg-red')}
                  aria-label={notification.read_at ? undefined : 'Sin leer'}
                />
                <div className="flex-fill min-w-0">
                  <div className={cx('text-truncate', !notification.read_at && 'fw-bold')}>{notification.title ?? notification.type.label}</div>
                  {notification.message && <div className="small text-secondary text-truncate">{notification.message}</div>}
                </div>
                <div className="small text-secondary text-nowrap">{formatRelative(notification.created_at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Accesos directos
// ---------------------------------------------------------------------------------------------------------------

/** Grilla compacta con los módulos que el usuario puede abrir, por sección. */
export function Shortcuts({ sections }: { sections: NavSection[] }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Accesos directos</h3>
      </div>
      <div className="card-body">
        {sections.map((section, index) => (
          <div key={section.title} className={cx(index < sections.length - 1 && 'mb-3')}>
            <div className="subheader mb-2">{section.title}</div>
            <div className="row g-2">
              {section.items.map((item) => (
                <div key={item.to} className="col-6 col-md-4 col-xl-3">
                  <Link
                    to={item.to}
                    className="card card-sm card-link card-link-pop h-100 text-reset text-decoration-none"
                  >
                    <div className="card-body d-flex align-items-center gap-2 py-2">
                      <item.icon size={20} stroke={1.75} className="text-primary flex-shrink-0" aria-hidden="true" />
                      <span className="small text-truncate">{item.label}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
