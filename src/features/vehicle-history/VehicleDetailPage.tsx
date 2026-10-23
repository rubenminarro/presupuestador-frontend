import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconAlertTriangle, IconArrowLeft } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { BUDGET_ITEM_TYPES, BUDGET_STATUS } from '@/features/budgets/api'
import { DIAGNOSTIC_ITEM_STATUS, PRIORITY } from '@/features/diagnostics/api'
import { INVOICE_PAYMENT_STATUS, INVOICE_STATUS } from '@/features/invoices/api'
import { VehicleMaintenanceTab } from '@/features/maintenance/VehicleMaintenanceTab'
import { RECEPTION_STATUS } from '@/features/receptions/api'
import { vehicleHistoryApi, type HistoryEntry, type HistoryPart, type MileageReading, type VehicleHistory } from '@/features/vehicle-history/api'
import { WORK_ORDER_ITEM_STATUS, WORK_ORDER_STATUS } from '@/features/work-orders/api'
import { cx } from '@/lib/cx'
import { formatDate, formatDateTime, formatGuarani, formatMoney, formatQuantity } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

type Tab = 'history' | 'parts' | 'mileage' | 'maintenance'

const km = (value: number | null | undefined) => (value === null || value === undefined ? '—' : `${new Intl.NumberFormat('es-PY').format(value)} km`)

/** Ficha del vehículo: historial de visitas, repuestos usados, kilometraje y mantenimiento preventivo. */
export function VehicleDetailPage() {
  const { id } = useParams()
  const vehicleId = Number(id)
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('history')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: ['vehicle-history', vehicleId, page],
    queryFn: () => vehicleHistoryApi.show(vehicleId, { page, per_page: 5 }),
    enabled: Number.isInteger(vehicleId),
    placeholderData: keepPreviousData,
  })
  const history = query.data

  if (!history) {
    return (
      <>
        <PageHeader pretitle="Vehículos" title="Vehículo" />
        <PageBody>
          <div className="card">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
        </PageBody>
      </>
    )
  }

  const vehicle = history.vehicle
  const tabs: [Tab, string][] = [
    ['history', 'Historial'],
    ['parts', 'Repuestos usados'],
    ['mileage', 'Kilometraje'],
    ...(can('vehicle-maintenances.index') ? ([['maintenance', 'Mantenimiento']] as [Tab, string][]) : []),
  ]

  return (
    <>
      <PageHeader
        pretitle={vehicle.client ? `Vehículo · ${vehicle.client.full_name}` : 'Vehículo'}
        title={`${vehicle.plate ?? (vehicle.chassis ? `Sin chapa · ${vehicle.chassis}` : 'Sin chapa')}${
          vehicle.brand ? ` · ${[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')}` : ''
        }`}
        actions={
          <>
            {vehicle.client && can('clients.show') && (
              <Link to={`/clients/${vehicle.client.id}`} className="btn btn-link">
                {vehicle.client.full_name}
              </Link>
            )}
            <Link to="/vehicles" className="btn btn-link">
              <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
              Vehículos
            </Link>
          </>
        }
      />
      <PageBody>
        <SummaryCards summary={history.summary} />
        <ul className="nav nav-tabs my-3" role="tablist">
          {tabs.map(([value, label]) => (
            <li key={value} className="nav-item" role="presentation">
              <button type="button" role="tab" aria-selected={tab === value} className={cx('nav-link', tab === value && 'active')} onClick={() => setTab(value)}>
                {label}
              </button>
            </li>
          ))}
        </ul>
        {tab === 'history' && (
          <div className={cx(query.isFetching && 'opacity-50')}>
            {history.timeline.length === 0 ? (
              <div className="card">
                <EmptyState message="El vehículo todavía no tiene visitas." />
              </div>
            ) : (
              history.timeline.map((entry) => <TimelineEntry key={entry.reception_id} entry={entry} />)
            )}
            {history.pagination.lastPage > 1 && (
              <div className="card mt-3">
                <div className="card-footer">
                  <Pagination pagination={history.pagination} onPageChange={setPage} />
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'parts' && <PartsTab vehicleId={vehicleId} />}
        {tab === 'mileage' && <MileageTab vehicleId={vehicleId} />}
        {tab === 'maintenance' && <VehicleMaintenanceTab vehicleId={vehicleId} />}
      </PageBody>
    </>
  )
}

function SummaryCards({ summary }: { summary: VehicleHistory['summary'] }) {
  const cards: [string, string, string?][] = [
    ['Visitas', String(summary.visits), summary.first_visit ? `desde ${formatDate(summary.first_visit)}` : undefined],
    ['Último ingreso', formatDate(summary.last_visit), summary.last_service_at ? `último servicio ${formatDate(summary.last_service_at)}` : undefined],
    ['Kilometraje', km(summary.last_mileage), `${summary.work_orders_completed} OT completada(s)`],
    ['Facturado (con IVA)', formatGuarani(summary.invoiced_total), Number(summary.balance_due) > 0 ? `saldo ${formatGuarani(summary.balance_due)}` : 'sin saldo'],
  ]

  return (
    <div className="row row-cards">
      {cards.map(([label, value, hint]) => (
        <div key={label} className="col-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <div className="subheader">{label}</div>
              <div className="h2 mb-0">{value}</div>
              {hint && <div className="small text-secondary">{hint}</div>}
            </div>
          </div>
        </div>
      ))}
      {summary.economics && (
        <div className="col-12">
          <div className="card">
            <div className="card-body d-flex flex-wrap gap-4">
              <div className="subheader w-100 mb-0">Resultado acumulado (sin IVA)</div>
              <span>Venta {formatMoney(summary.economics.sale_total)}</span>
              <span>Costo {formatMoney(summary.economics.cost_total)}</span>
              <strong>Margen {formatMoney(summary.economics.gross_margin)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Una visita: recepción, diagnósticos, presupuestos, OT (trabajos, repuestos, factura) y entrega. */
function TimelineEntry({ entry }: { entry: HistoryEntry }) {
  const { can } = useAuth()
  const link = (permission: string, to: string, text: string) => (can(permission) ? <Link to={to}>{text}</Link> : text)

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h3 className="card-title">
          {link('receptions.show', `/receptions/${entry.reception_id}`, `Recepción #${entry.reception_id}`)}
          <span className="text-secondary fw-normal ms-2">
            {formatDate(entry.reception_date)} · {km(entry.mileage_in)}
          </span>
        </h3>
        <div className="card-actions">
          <StatusBadge value={entry.status} map={RECEPTION_STATUS} />
        </div>
      </div>
      <div className="card-body">
        {(entry.problem_description || entry.service_categories.length > 0) && (
          <p className="mb-3">
            {entry.service_categories.map((category) => (
              <span key={category} className="badge bg-azure-lt me-1">
                {category}
              </span>
            ))}
            {entry.problem_description}
          </p>
        )}

        {entry.diagnostics.map((diagnostic) => (
          <div key={diagnostic.id} className="mb-3">
            <div className="fw-bold">
              {link('diagnostics.show', `/diagnostics/${diagnostic.id}`, `Diagnóstico #${diagnostic.id}`)}{' '}
              <span className="fw-normal text-secondary">{formatDateTime(diagnostic.diagnosed_at)}</span>{' '}
              <StatusBadge value={diagnostic.priority} map={PRIORITY} />
            </div>
            {diagnostic.diagnosis && <div>{diagnostic.diagnosis}</div>}
            {diagnostic.findings.length > 0 && (
              <ul className="small mb-0">
                {diagnostic.findings.map((finding, index) => (
                  <li key={index}>
                    {finding.title} · <StatusBadge value={finding.status} map={DIAGNOSTIC_ITEM_STATUS} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {entry.budgets.length > 0 && (
          <div className="mb-3">
            <span className="fw-bold me-2">Presupuestos</span>
            {entry.budgets.map((budget) => (
              <span key={budget.id} className="me-3 text-nowrap">
                {link('budgets.show', `/budgets/${budget.id}`, budget.code)} <StatusBadge value={budget.status} map={BUDGET_STATUS} />{' '}
                <span className="text-secondary small">{formatMoney(budget.total)}</span>
              </span>
            ))}
          </div>
        )}

        {entry.work_orders.map((workOrder) => (
          <div key={workOrder.id} className="border rounded p-2 mb-3">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <strong>{link('work-orders.show', `/work-orders/${workOrder.id}`, workOrder.code)}</strong>
              <StatusBadge value={workOrder.status} map={WORK_ORDER_STATUS} />
              <span className="text-secondary small">
                {[workOrder.mechanic, workOrder.completed_at && `terminada ${formatDate(workOrder.completed_at)}`].filter(Boolean).join(' · ')}
              </span>
            </div>
            <ul className="small mb-1">
              {workOrder.jobs.map((job, index) => (
                <li key={index}>
                  {job.description} <span className="text-secondary">({BUDGET_ITEM_TYPES[job.type]})</span>{' '}
                  <StatusBadge value={job.status} map={WORK_ORDER_ITEM_STATUS} />
                </li>
              ))}
            </ul>
            {workOrder.parts_used.length > 0 && (
              <div className="small mb-1">
                <span className="text-secondary">Repuestos: </span>
                {workOrder.parts_used.map((part) => `${part.name ?? part.part_code} × ${formatQuantity(part.quantity)}`).join(', ')}
              </div>
            )}
            {workOrder.invoice && (
              <div className="small">
                <span className="text-secondary">Factura: </span>
                {workOrder.invoice.number ?? 'borrador'} · {formatGuarani(workOrder.invoice.total)}{' '}
                <StatusBadge value={workOrder.invoice.status} map={INVOICE_STATUS} />{' '}
                {workOrder.invoice.payment_status && <StatusBadge value={workOrder.invoice.payment_status} map={INVOICE_PAYMENT_STATUS} />}
              </div>
            )}
            {workOrder.economics && (
              <div className="small text-secondary">
                Sin IVA: venta {formatMoney(workOrder.economics.sale_total)} · costo {formatMoney(workOrder.economics.cost_total)} · margen{' '}
                {formatMoney(workOrder.economics.gross_margin)}
                {!workOrder.economics.is_cost_complete && ' (costos incompletos)'}
              </div>
            )}
          </div>
        ))}

        {entry.delivery ? (
          <div className="small">
            <span className="fw-bold">Entregado</span> {formatDateTime(entry.delivery.delivered_at)} · {entry.delivery.delivery_number} · retiró{' '}
            {entry.delivery.received_by} · {km(entry.delivery.mileage_out)}
          </div>
        ) : (
          entry.work_orders.length === 0 &&
          entry.diagnostics.length === 0 &&
          entry.budgets.length === 0 && <div className="text-secondary small">Sin trabajos registrados.</div>
        )}
      </div>
    </div>
  )
}

function PartsTab({ vehicleId }: { vehicleId: number }) {
  const { can } = useAuth()
  const list = useListParams(20)
  const showCost = can('work-orders.view-economics')
  const params = { page: list.page, per_page: 20 }
  const query = useQuery({
    queryKey: ['vehicle-history', vehicleId, 'parts', params],
    queryFn: () => vehicleHistoryApi.parts(vehicleId, params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<HistoryPart>[] = [
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (part) => formatDate(part.used_at) },
    {
      key: 'part',
      header: 'Repuesto',
      render: (part) => (
        <>
          <div>{part.name ?? '—'}</div>
          <div className="small text-secondary">{[part.part_code, part.brand].filter(Boolean).join(' · ')}</div>
        </>
      ),
    },
    {
      key: 'work_order',
      header: 'OT',
      className: 'text-nowrap',
      render: (part) =>
        can('work-orders.show') ? <Link to={`/work-orders/${part.work_order_id}`}>{part.work_order_code}</Link> : part.work_order_code,
    },
    { key: 'quantity', header: 'Cant.', className: 'text-end', render: (part) => formatQuantity(part.quantity) },
    { key: 'price', header: 'Precio (sin IVA)', className: 'text-end text-nowrap', render: (part) => formatMoney(part.total_price) },
    ...(showCost ? [{ key: 'cost', header: 'Costo', className: 'text-end text-nowrap', render: (part: HistoryPart) => formatMoney(part.total_cost) }] : []),
  ]

  return (
    <DataTable
      columns={columns}
      rows={query.data?.items}
      rowKey={(part) => `${part.work_order_id}-${part.part_id}-${part.used_at}`}
      isLoading={query.isFetching}
      error={query.error}
      onRetry={() => void query.refetch()}
      pagination={query.data?.pagination}
      onPageChange={list.setPage}
      emptyMessage="No se usaron repuestos en este vehículo."
    />
  )
}

function MileageTab({ vehicleId }: { vehicleId: number }) {
  const { can } = useAuth()
  const query = useQuery({ queryKey: ['vehicle-history', vehicleId, 'mileage'], queryFn: () => vehicleHistoryApi.mileage(vehicleId) })
  // Más reciente primero.
  const readings = [...(query.data ?? [])].reverse()

  const columns: Column<MileageReading>[] = [
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (reading) => formatDate(reading.date) },
    {
      key: 'mileage',
      header: 'Kilometraje',
      className: 'text-end text-nowrap',
      render: (reading) => (
        <>
          {km(reading.mileage)}
          {reading.decreased && (
            <div className="small text-warning">
              <IconAlertTriangle size={14} className="me-1" aria-hidden="true" />
              Menor que la lectura anterior
            </div>
          )}
        </>
      ),
    },
    {
      key: 'source',
      header: 'Origen',
      render: (reading) =>
        reading.source === 'reception'
          ? can('receptions.show')
            ? <Link to={`/receptions/${reading.reference_id}`}>Ingreso (recepción #{reading.reference_id})</Link>
            : `Ingreso (recepción #${reading.reference_id})`
          : can('vehicle-deliveries.show')
            ? <Link to={`/vehicle-deliveries/${reading.reference_id}`}>Entrega</Link>
            : 'Entrega',
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={query.data ? readings : undefined}
      rowKey={(reading) => `${reading.source}-${reading.reference_id}`}
      isLoading={query.isFetching}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyMessage="No hay lecturas de kilometraje."
    />
  )
}
