import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconChecks, IconCheck } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import {
  INTERNAL_NOTIFICATION_TYPES,
  internalNotificationLink,
  notificationsApi,
  type InternalNotificationType,
  type UserNotification,
} from '@/features/notifications/api'
import { useMarkAllAsRead, useMarkAsRead } from '@/features/notifications/useInbox'
import { cx } from '@/lib/cx'
import { formatDateTime } from '@/lib/format'

/** Bandeja interna del usuario (sin permiso: cada uno ve solo sus avisos). */
export function NotificationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [type, setType] = useState<InternalNotificationType | ''>('')
  const markAsRead = useMarkAsRead()
  const markAll = useMarkAllAsRead()

  const params = { page, per_page: 15, unread: unreadOnly ? 1 : undefined, type }
  const query = useQuery({
    queryKey: ['me-notifications', 'page', params],
    queryFn: () => notificationsApi.inbox(params),
    placeholderData: keepPreviousData,
  })
  const unread = query.data?.meta.unread_count ?? 0

  function open(notification: UserNotification) {
    if (!notification.read_at) markAsRead.mutate(notification.id)
    const link = internalNotificationLink(notification)
    if (link) navigate(link)
  }

  const columns: Column<UserNotification>[] = [
    {
      key: 'notification',
      header: 'Aviso',
      render: (notification) => (
        <div className="d-flex gap-2">
          <span
            className={cx('status-dot mt-2 flex-shrink-0', notification.read_at ? 'bg-transparent' : 'bg-red')}
            aria-label={notification.read_at ? undefined : 'Sin leer'}
          />
          <div>
            <div className={cx(!notification.read_at && 'fw-bold')}>{notification.title ?? notification.type.label}</div>
            <div className="text-secondary small">{notification.message}</div>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Tipo', render: (notification) => notification.type.label ?? notification.type.value },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (notification) => formatDateTime(notification.created_at) },
    {
      key: 'read',
      header: 'Leído',
      className: 'text-nowrap',
      render: (notification) => (notification.read_at ? formatDateTime(notification.read_at) : <span className="text-secondary">—</span>),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (notification) =>
        !notification.read_at && (
          <IconButton
            label="Marcar como leído"
            icon={IconCheck}
            disabled={markAsRead.isPending}
            onClick={() => markAsRead.mutate(notification.id)}
          />
        ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Mi cuenta"
        title="Avisos"
        actions={
          <button type="button" className="btn btn-outline-primary" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
            <IconChecks size={18} className="me-1" aria-hidden="true" />
            Marcar todo como leído
          </button>
        }
      />
      <PageBody>
        <DataTable
          title={unread > 0 ? `${unread} sin leer` : 'Todo leído'}
          columns={columns}
          rows={query.data?.data}
          rowKey={(notification) => notification.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.meta.pagination}
          onPageChange={setPage}
          onRowClick={open}
          emptyMessage={unreadOnly ? 'No tenés avisos sin leer.' : 'No tenés avisos.'}
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por lectura"
                value={unreadOnly ? 'unread' : ''}
                onChange={(event) => {
                  setUnreadOnly(event.target.value === 'unread')
                  setPage(1)
                }}
              >
                <option value="">Todos</option>
                <option value="unread">Sin leer</option>
              </select>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por tipo"
                value={type}
                onChange={(event) => {
                  setType(event.target.value as InternalNotificationType | '')
                  setPage(1)
                }}
              >
                <option value="">Todos los tipos</option>
                {Object.entries(INTERNAL_NOTIFICATION_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          }
        />
      </PageBody>
    </>
  )
}
