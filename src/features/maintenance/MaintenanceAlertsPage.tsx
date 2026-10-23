import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { MAINTENANCE_STATUS, maintenanceApi, type MaintenanceAlert } from '@/features/maintenance/api'
import { formatDate } from '@/lib/format'

const km = (value: number | null) => (value === null ? '—' : `${new Intl.NumberFormat('es-PY').format(value)} km`)

/** Mantenimientos vencidos o por vencer de todos los vehículos (planes activos con al menos un registro). */
export function MaintenanceAlertsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const params = { status, page, per_page: 20 }

  const query = useQuery({
    queryKey: ['maintenance-alerts', params],
    queryFn: () => maintenanceApi.alerts(params),
    placeholderData: keepPreviousData,
  })
  const counts = query.data?.meta.counts

  const columns: Column<MaintenanceAlert>[] = [
    {
      key: 'vehicle',
      header: 'Vehículo / cliente',
      render: (alert) => (
        <>
          <div>{alert.vehicle.plate ?? 'Sin chapa'}</div>
          {alert.client && (
            <div className="small text-secondary">
              {can('clients.show') ? (
                <Link to={`/clients/${alert.client.id}`} onClick={(event) => event.stopPropagation()}>
                  {alert.client.full_name}
                </Link>
              ) : (
                alert.client.full_name
              )}
              {alert.client.phone && ` · ${alert.client.phone}`}
            </div>
          )}
        </>
      ),
    },
    { key: 'plan', header: 'Plan', render: (alert) => alert.plan },
    {
      key: 'last',
      header: 'Último',
      className: 'text-nowrap',
      render: (alert) => (
        <>
          <div>{formatDate(alert.last_done_at)}</div>
          <div className="small text-secondary">{km(alert.last_done_mileage)}</div>
        </>
      ),
    },
    {
      key: 'due',
      header: 'Vence',
      render: (alert) => (
        <>
          <div className="text-nowrap">{[alert.next_due_at && formatDate(alert.next_due_at), alert.next_due_mileage !== null && km(alert.next_due_mileage)].filter(Boolean).join(' · ')}</div>
          <div className="small text-secondary">
            {[
              alert.remaining_days !== null && (alert.remaining_days < 0 ? `hace ${-alert.remaining_days} día(s)` : `en ${alert.remaining_days} día(s)`),
              alert.remaining_km !== null && (alert.remaining_km < 0 ? `pasado ${km(-alert.remaining_km)}` : `faltan ${km(alert.remaining_km)}`),
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </>
      ),
    },
    { key: 'mileage', header: 'Km estimado', className: 'text-end text-nowrap', render: (alert) => km(alert.vehicle.estimated_mileage) },
    { key: 'status', header: 'Estado', render: (alert) => <StatusBadge value={alert.status.value} map={MAINTENANCE_STATUS} /> },
  ]

  const filter = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  return (
    <>
      <PageHeader pretitle="Taller" title="Alertas de mantenimiento" />
      <PageBody>
        {counts && (
          <div className="row row-cards mb-3">
            {(
              [
                ['overdue', 'Vencidos', counts.overdue, 'text-red'],
                ['due_soon', 'Por vencer', counts.due_soon, 'text-yellow'],
              ] as const
            ).map(([value, label, count, color]) => (
              <div key={value} className="col-6 col-md-3">
                <button
                  type="button"
                  className={`card card-link w-100 text-start ${status === value ? 'border-primary' : ''}`}
                  aria-pressed={status === value}
                  onClick={() => filter(status === value ? '' : value)}
                >
                  <div className="card-body">
                    <div className="subheader">{label}</div>
                    <div className={`h1 mb-0 ${color}`}>{count}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(alert) => `${alert.vehicle.id}-${alert.maintenance_plan_id}`}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.meta.pagination}
          onPageChange={setPage}
          emptyMessage="No hay mantenimientos vencidos ni por vencer."
          onRowClick={can('vehicle-history.view') ? (alert) => navigate(`/vehicles/${alert.vehicle.id}`) : undefined}
          toolbar={
            <select className="form-select form-select-sm w-auto" aria-label="Filtrar por estado" value={status} onChange={(event) => filter(event.target.value)}>
              <option value="">Vencidos y por vencer</option>
              <option value="overdue">Vencidos</option>
              <option value="due_soon">Por vencer</option>
            </select>
          }
        />
        <div className="small text-secondary mt-2">
          El kilometraje se estima con el promedio de km por día entre las lecturas de ingresos y entregas.
        </div>
      </PageBody>
    </>
  )
}
