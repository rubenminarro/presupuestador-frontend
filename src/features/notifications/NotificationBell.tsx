import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconBell } from '@tabler/icons-react'
import { internalNotificationLink, notificationsApi, type UserNotification } from '@/features/notifications/api'
import { useMarkAllAsRead, useMarkAsRead } from '@/features/notifications/useInbox'
import { cx } from '@/lib/cx'
import { formatDateTime } from '@/lib/format'

/** Campana de la barra superior: contador de no leídos y los últimos avisos. Se refresca cada minuto. */
export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const markAsRead = useMarkAsRead()
  const markAll = useMarkAllAsRead()

  const query = useQuery({
    queryKey: ['me-notifications', 'bell'],
    queryFn: () => notificationsApi.inbox({ per_page: 6 }),
    refetchInterval: 60_000,
  })
  const unread = query.data?.meta.unread_count ?? 0

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function openNotification(notification: UserNotification) {
    if (!notification.read_at) markAsRead.mutate(notification.id)
    const link = internalNotificationLink(notification)
    setOpen(false)
    if (link) navigate(link)
  }

  return (
    // position-static: el panel se ancla al contenedor de la barra (no a la campana) para no salirse de la pantalla en móvil.
    <div className="nav-item dropdown position-static me-3" ref={menuRef}>
      <button
        type="button"
        className="nav-link px-0 border-0 bg-transparent position-relative"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `Avisos: ${unread} sin leer` : 'Avisos'}
        title="Avisos"
        onClick={() => setOpen((value) => !value)}
      >
        <IconBell size={22} stroke={1.75} aria-hidden="true" />
        {unread > 0 && (
          <span className="badge bg-red text-red-fg badge-pill position-absolute top-0 start-100 translate-middle">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <div
        className={cx('dropdown-menu dropdown-menu-end dropdown-menu-card', open && 'show')}
        style={{ right: 'var(--tblr-gutter-x, 1.5rem)', top: '100%', width: 'min(22rem, calc(100vw - 2rem))' }}
        role="menu"
      >
        <div className="card">
          <div className="card-header d-flex align-items-center">
            <h3 className="card-title me-auto">Avisos</h3>
            {unread > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
                Marcar todo como leído
              </button>
            )}
          </div>
          <div className="list-group list-group-flush" style={{ maxHeight: '22rem', overflowY: 'auto' }}>
            {query.data?.data.length === 0 && <div className="list-group-item text-secondary">No tenés avisos.</div>}
            {!query.data && <div className="list-group-item text-secondary">{query.error ? 'No se pudieron cargar los avisos.' : 'Cargando…'}</div>}
            {query.data?.data.map((notification) => (
              <button
                key={notification.id}
                type="button"
                role="menuitem"
                className="list-group-item list-group-item-action text-start"
                onClick={() => openNotification(notification)}
              >
                <div className="d-flex gap-2">
                  <span
                    className={cx('status-dot mt-2 flex-shrink-0', notification.read_at ? 'bg-transparent' : 'status-dot-animated bg-red')}
                    aria-label={notification.read_at ? undefined : 'Sin leer'}
                  />
                  <div className="min-w-0">
                    <div className={cx('text-truncate', !notification.read_at && 'fw-bold')}>{notification.title ?? notification.type.label}</div>
                    <div className="text-secondary small text-wrap">{notification.message}</div>
                    <div className="text-secondary small mt-1">{formatDateTime(notification.created_at)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="card-footer text-center py-2">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              Ver todos los avisos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
