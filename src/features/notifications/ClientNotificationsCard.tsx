import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/DataTable'
import { notificationsApi } from '@/features/notifications/api'
import { clientNotificationColumns } from '@/features/notifications/clientNotificationColumns'
import { ClientNotificationModal } from '@/features/notifications/ClientNotificationModal'

/** Avisos enviados a un cliente (ficha del cliente). */
export function ClientNotificationsCard({ clientId, enabled }: { clientId: number; enabled: boolean }) {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)

  const params = { page, per_page: 10 }
  const query = useQuery({
    queryKey: ['client-notifications', 'client', clientId, params],
    queryFn: () => notificationsApi.forClient(clientId, params),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <DataTable
        title="Avisos enviados"
        columns={clientNotificationColumns({ showClient: false })}
        rows={query.data?.items}
        rowKey={(row) => row.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        pagination={query.data?.pagination}
        onPageChange={setPage}
        onRowClick={(row) => setSelected(row.id)}
        emptyMessage={
          enabled
            ? 'Todavía no se le envió ningún aviso.'
            : 'Todavía no se le envió ningún aviso. El cliente tiene los avisos desactivados.'
        }
      />
      {selected !== null && <ClientNotificationModal notificationId={selected} onClose={() => setSelected(null)} onResent={setSelected} />}
    </>
  )
}
