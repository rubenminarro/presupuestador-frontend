import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { WORK_ORDER_STATUS, workOrdersApi, type WorkOrder } from '@/features/work-orders/api'
import { formatDate } from '@/lib/format'

/** OT de la recepción (en su ficha). Se generan desde el presupuesto aprobado. */
export function ReceptionWorkOrders({ receptionId }: { receptionId: number }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const params = { reception_id: receptionId, per_page: 50 }

  const query = useQuery({
    queryKey: ['work-orders', params],
    queryFn: () => workOrdersApi.list(params),
  })

  const columns: Column<WorkOrder>[] = [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (order) => <span className="text-secondary">{order.code}</span> },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (order) => formatDate(order.created_at) },
    { key: 'budget', header: 'Presupuesto', render: (order) => order.budget?.code ?? `#${order.budget_id}` },
    { key: 'mechanic', header: 'Responsable', render: (order) => order.mechanic?.user?.full_name ?? '—' },
    { key: 'status', header: 'Estado', render: (order) => <StatusBadge value={order.status.value} map={WORK_ORDER_STATUS} /> },
  ]

  return (
    <DataTable
      title="Órdenes de trabajo"
      columns={columns}
      rows={query.data?.items}
      rowKey={(order) => order.id}
      isLoading={query.isFetching}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyMessage="Sin órdenes de trabajo: se generan desde un presupuesto aprobado."
      onRowClick={can('work-orders.show') ? (order) => navigate(`/work-orders/${order.id}`) : undefined}
    />
  )
}
