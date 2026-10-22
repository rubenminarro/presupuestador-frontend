import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { DELIVERY_STATUS, deliveriesApi, type DeliverySummary } from '@/features/deliveries/api'
import { formatDateTime } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

/** Las entregas se registran desde la ficha de la recepción terminada. */
export function DeliveriesPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const params = { ...list.params, status, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: ['vehicle-deliveries', params],
    queryFn: () => deliveriesApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  const columns: Column<DeliverySummary>[] = [
    { key: 'number', header: 'Número', className: 'text-nowrap', render: (delivery) => <span className="text-secondary">{delivery.delivery_number}</span> },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (delivery) => formatDateTime(delivery.delivered_at) },
    {
      key: 'vehicle',
      header: 'Vehículo / cliente',
      render: (delivery) => (
        <>
          <div>{delivery.plate ?? 'Sin chapa'}</div>
          <div className="small text-secondary">
            {delivery.client_name && `${delivery.client_name} · `}
            {can('receptions.show') ? (
              <Link to={`/receptions/${delivery.reception_id}`} onClick={(event) => event.stopPropagation()}>
                recepción #{delivery.reception_id}
              </Link>
            ) : (
              `recepción #${delivery.reception_id}`
            )}
          </div>
        </>
      ),
    },
    { key: 'received', header: 'Retiró', render: (delivery) => delivery.received_by_name },
    {
      key: 'mileage',
      header: 'Km',
      className: 'text-end text-nowrap',
      render: (delivery) => new Intl.NumberFormat('es-PY').format(delivery.final_mileage),
    },
    { key: 'status', header: 'Estado', render: (delivery) => <StatusBadge value={delivery.status.value} map={DELIVERY_STATUS} /> },
  ]

  return (
    <>
      <PageHeader pretitle="Taller" title="Entregas" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(delivery) => delivery.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          emptyMessage="No hay entregas: se registran desde la ficha de una recepción terminada."
          onRowClick={can('vehicle-deliveries.show') ? (delivery) => navigate(`/vehicle-deliveries/${delivery.id}`) : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Número, chapa, quién retiró o documento…' }}
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter(setStatus)(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(DELIVERY_STATUS).map(([value, { label }]) => (
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
