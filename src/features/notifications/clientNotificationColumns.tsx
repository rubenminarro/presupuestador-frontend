import { Link } from 'react-router-dom'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CLIENT_NOTIFICATION_STATUS, clientNotificationLink, SUBJECT_LABELS, type ClientNotification } from '@/features/notifications/api'
import { formatDateTime } from '@/lib/format'

/** Columnas del listado de avisos a clientes; en la ficha del cliente va sin la columna de cliente. */
export function clientNotificationColumns({ showClient }: { showClient: boolean }): Column<ClientNotification>[] {
  return [
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (row) => formatDateTime(row.created_at) },
    ...(showClient
      ? [
          {
            key: 'client',
            header: 'Cliente',
            render: (row: ClientNotification) => (
              <Link to={`/clients/${row.client_id}`} onClick={(event) => event.stopPropagation()}>
                {row.client_name || `#${row.client_id}`}
              </Link>
            ),
          },
        ]
      : []),
    {
      key: 'type',
      header: 'Aviso',
      render: (row) => (
        <>
          <div>{row.type.label}</div>
          {row.resent_from_id && <div className="small text-secondary">Reenvío del #{row.resent_from_id}</div>}
        </>
      ),
    },
    {
      key: 'subject',
      header: 'Documento',
      className: 'text-nowrap',
      render: (row) => {
        const link = clientNotificationLink(row.subject)
        const label = `${SUBJECT_LABELS[row.subject.type] ?? row.subject.type} #${row.subject.id}`
        return link ? (
          <Link to={link} onClick={(event) => event.stopPropagation()}>
            {label}
          </Link>
        ) : (
          label
        )
      },
    },
    { key: 'recipient', header: 'Destinatario', render: (row) => row.recipient ?? <span className="text-secondary">—</span> },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => (
        <>
          <StatusBadge value={row.status.value} map={CLIENT_NOTIFICATION_STATUS} />
          {row.error && <div className="small text-secondary text-wrap">{row.error}</div>}
        </>
      ),
    },
  ]
}
