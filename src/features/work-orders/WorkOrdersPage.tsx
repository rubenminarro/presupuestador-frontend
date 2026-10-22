import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { receptionVehicleLabel } from '@/features/receptions/api'
import { WORK_ORDER_STATUS, workOrdersApi, type WorkOrder } from '@/features/work-orders/api'
import { formatDate } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

/** Las OT se generan desde un presupuesto aprobado. */
export function WorkOrdersPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const params = { ...list.params, status, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: ['work-orders', params],
    queryFn: () => workOrdersApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  const columns: Column<WorkOrder>[] = [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (order) => <span className="text-secondary">{order.code}</span> },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (order) => formatDate(order.created_at) },
    {
      key: 'vehicle',
      header: 'Vehículo / cliente',
      render: (order) =>
        order.reception ? (
          <>
            <div>
              {receptionVehicleLabel(order.reception.vehicle)}
              <span className="text-secondary ms-1">{[order.reception.vehicle.brand, order.reception.vehicle.model].filter(Boolean).join(' ')}</span>
            </div>
            <div className="small text-secondary">
              {order.reception.client.full_name} ·{' '}
              {can('receptions.show') ? (
                <Link to={`/receptions/${order.reception_id}`} onClick={(event) => event.stopPropagation()}>
                  recepción #{order.reception_id}
                </Link>
              ) : (
                `recepción #${order.reception_id}`
              )}
            </div>
          </>
        ) : (
          '—'
        ),
    },
    { key: 'mechanic', header: 'Responsable', render: (order) => order.mechanic?.user?.full_name ?? '—' },
    { key: 'status', header: 'Estado', render: (order) => <StatusBadge value={order.status.value} map={WORK_ORDER_STATUS} /> },
  ]

  return (
    <>
      <PageHeader pretitle="Taller" title="Órdenes de trabajo" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(order) => order.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          onRowClick={can('work-orders.show') ? (order) => navigate(`/work-orders/${order.id}`) : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Código, cliente, documento o chapa…' }}
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter(setStatus)(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(WORK_ORDER_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Desde"
                title="Desde"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => filter(setDateFrom)(event.target.value)}
              />
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Hasta"
                title="Hasta"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => filter(setDateTo)(event.target.value)}
              />
            </>
          }
        />
      </PageBody>
    </>
  )
}
