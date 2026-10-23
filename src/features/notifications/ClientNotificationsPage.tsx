import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import {
  CLIENT_NOTIFICATION_STATUS,
  CLIENT_NOTIFICATION_TYPES,
  notificationsApi,
  type ClientNotificationStatus,
  type ClientNotificationType,
} from '@/features/notifications/api'
import { clientNotificationColumns } from '@/features/notifications/clientNotificationColumns'
import { ClientNotificationModal } from '@/features/notifications/ClientNotificationModal'

/** Registro de avisos por email a clientes, con filtros y reenvío desde el detalle. */
export function ClientNotificationsPage() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState<ClientNotificationType | ''>('')
  const [status, setStatus] = useState<ClientNotificationStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const params = { page, per_page: 15, type, status, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: ['client-notifications', params],
    queryFn: () => notificationsApi.clientList(params),
    placeholderData: keepPreviousData,
  })

  // Cualquier filtro vuelve a la primera página.
  const filter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  return (
    <>
      <PageHeader
        pretitle="Clientes"
        title="Avisos a clientes"
        actions={
          <div className="d-flex flex-wrap gap-2">
            <input
              type="date"
              className="form-control w-auto"
              aria-label="Desde"
              title="Desde"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => filter(setDateFrom)(event.target.value)}
            />
            <input
              type="date"
              className="form-control w-auto"
              aria-label="Hasta"
              title="Hasta"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => filter(setDateTo)(event.target.value)}
            />
          </div>
        }
      />
      <PageBody>
        <DataTable
          columns={clientNotificationColumns({ showClient: true })}
          rows={query.data?.items}
          rowKey={(row) => row.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={setPage}
          onRowClick={(row) => setSelected(row.id)}
          emptyMessage="No hay avisos con esos filtros."
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por tipo"
                value={type}
                onChange={(event) => filter(setType)(event.target.value as ClientNotificationType | '')}
              >
                <option value="">Todos los tipos</option>
                {Object.entries(CLIENT_NOTIFICATION_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter(setStatus)(event.target.value as ClientNotificationStatus | '')}
              >
                <option value="">Todos los estados</option>
                {Object.entries(CLIENT_NOTIFICATION_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          }
        />
      </PageBody>
      {selected !== null && <ClientNotificationModal notificationId={selected} onClose={() => setSelected(null)} onResent={setSelected} />}
    </>
  )
}
