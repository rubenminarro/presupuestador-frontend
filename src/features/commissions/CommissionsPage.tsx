import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconCash } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import {
  COMMISSION_STATUS,
  commissionsApi,
  type CommissionLine,
  type CommissionStatus,
  type MechanicCommissions,
} from '@/features/commissions/api'
import { mechanicsApi } from '@/features/mechanics/api'
import { formatDate, formatDateTime, formatDecimal, formatMoney } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

/**
 * Comisiones congeladas de un mecánico por período (sin fechas, el mes en curso) y su liquidación.
 * Con `mechanic-commissions.view-all` se elige el mecánico; sin él, cada mecánico ve las propias.
 */
export function CommissionsPage() {
  const { can, mechanic: ownMechanic } = useAuth()
  const canPickMechanic = can('mechanic-commissions.view-all') && can('mechanics.index')

  const [mechanicId, setMechanicId] = useState(ownMechanic ? String(ownMechanic.id) : '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState<CommissionStatus | ''>('')

  // Todos los mecánicos (también inactivos o en licencia: pueden tener comisiones por liquidar).
  const mechanics = useQuery({
    queryKey: ['mechanics', 'all'],
    queryFn: async () => (await mechanicsApi.list({ per_page: 1000 })).items,
    enabled: canPickMechanic,
    staleTime: 5 * 60_000,
  })

  const selectedId = canPickMechanic ? Number(mechanicId) || null : (ownMechanic?.id ?? null)
  const params = { date_from: dateFrom, date_to: dateTo, status }

  const query = useQuery({
    queryKey: ['commissions', selectedId, params],
    queryFn: () => commissionsApi.list(selectedId!, params),
    enabled: selectedId !== null,
    placeholderData: keepPreviousData,
  })

  function renderBody() {
    if (selectedId === null) {
      return canPickMechanic ? (
        <div className="card">
          <EmptyState title="Elegí un mecánico" message="Seleccioná un mecánico para ver sus comisiones del período." />
        </div>
      ) : (
        <div className="card">
          <EmptyState title="Sin ficha de mecánico" message="Tu usuario no tiene una ficha de mecánico vinculada." />
        </div>
      )
    }
    if (query.data) {
      return <CommissionsDetail data={query.data} status={status} isFetching={query.isFetching} />
    }
    return (
      <div className="card">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
    )
  }

  return (
    <>
      <PageHeader
        pretitle="Taller"
        title="Comisiones"
        actions={
          <div className="d-flex flex-wrap gap-2">
            {canPickMechanic && (
              <select
                className="form-select w-auto"
                aria-label="Mecánico"
                value={mechanicId}
                disabled={mechanics.isLoading}
                onChange={(event) => setMechanicId(event.target.value)}
              >
                <option value="">{mechanics.isLoading ? 'Cargando mecánicos…' : 'Elegir mecánico'}</option>
                {mechanics.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.user?.full_name ?? item.employee_code} ({item.employee_code})
                  </option>
                ))}
              </select>
            )}
            <input
              type="date"
              className="form-control w-auto"
              aria-label="Desde"
              title="Desde"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <input
              type="date"
              className="form-control w-auto"
              aria-label="Hasta"
              title="Hasta"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
            />
            <select
              className="form-select w-auto"
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => setStatus(event.target.value as CommissionStatus | '')}
            >
              <option value="">Todos los estados</option>
              {Object.entries(COMMISSION_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        }
      />
      <PageBody>{renderBody()}</PageBody>
    </>
  )
}

const columns: Column<CommissionLine>[] = [
  {
    key: 'work_order',
    header: 'OT',
    render: (line) => <Link to={`/work-orders/${line.work_order_id}`}>{line.work_order_code}</Link>,
  },
  { key: 'completed_at', header: 'Completada', render: (line) => formatDate(line.completed_at) },
  { key: 'description', header: 'Trabajo', render: (line) => line.description },
  { key: 'item_total', header: 'Total del ítem', className: 'text-end', render: (line) => formatMoney(line.item_total) },
  { key: 'share', header: 'Participación', className: 'text-end', render: (line) => `${formatDecimal(line.share_percentage)} %` },
  {
    key: 'percentage',
    header: 'Comisión %',
    className: 'text-end',
    render: (line) => `${formatDecimal(line.commission_percentage)} %`,
  },
  {
    key: 'amount',
    header: 'Comisión',
    className: 'text-end',
    render: (line) => <strong>{formatMoney(line.commission_amount)}</strong>,
  },
  {
    key: 'status',
    header: 'Estado',
    render: (line) => (
      <span title={line.settled_at ? `Liquidada el ${formatDateTime(line.settled_at)}` : undefined}>
        <StatusBadge value={line.settled_at ? 'settled' : 'pending'} map={COMMISSION_STATUS} />
      </span>
    ),
  },
]

interface CommissionsDetailProps {
  data: MechanicCommissions
  status: CommissionStatus | ''
  isFetching: boolean
}

function CommissionsDetail({ data, status, isFetching }: CommissionsDetailProps) {
  const { can } = useAuth()
  const [settling, setSettling] = useState(false)
  const { mechanic, period } = data

  const settle = useApiMutation(() => commissionsApi.settle(mechanic.id, period), {
    invalidate: [['commissions']],
    successMessage: 'Comisiones liquidadas.',
    onSuccess: () => setSettling(false),
  })

  // Con el filtro "Liquidada" el total pendiente no se conoce; el backend vuelve a validar que haya algo por liquidar.
  const hasPending = status !== 'settled' && Number(data.total_pending) > 0
  const periodLabel = `del ${formatDate(period.date_from)} al ${formatDate(period.date_to)}`

  return (
    <div className={isFetching ? 'opacity-50' : undefined}>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <p className="text-secondary mb-0 me-auto">
          {mechanic.full_name} ({mechanic.employee_code}) · {periodLabel} · importes sin IVA.
        </p>
        {can('mechanic-commissions.settle') && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!hasPending}
            title={hasPending ? undefined : 'No hay comisiones pendientes en el período.'}
            onClick={() => setSettling(true)}
          >
            <IconCash size={18} className="me-1" aria-hidden="true" />
            Liquidar período
          </button>
        )}
      </div>
      <div className="row row-cards mb-3">
        <TotalCard label="Total del período" value={data.total_commission} />
        <TotalCard label="Pendiente de liquidar" value={data.total_pending} />
        <TotalCard label="Liquidado" value={data.total_settled} />
      </div>
      <DataTable
        title="Detalle por trabajo"
        columns={columns}
        rows={data.lines}
        rowKey={(line) => line.id}
        emptyMessage="No hay comisiones en el período. Se generan al completar cada orden de trabajo."
      />
      <ConfirmDialog
        open={settling}
        title="Liquidar comisiones"
        message={
          <>
            Se marcarán como liquidadas las comisiones pendientes de <strong>{mechanic.full_name}</strong> {periodLabel}, por{' '}
            <strong>{formatMoney(data.total_pending)}</strong>. No se puede deshacer.
          </>
        }
        confirmLabel="Liquidar"
        isLoading={settle.isPending}
        onConfirm={() => settle.mutate()}
        onClose={() => setSettling(false)}
      />
    </div>
  )
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-12 col-md-4">
      <div className="card">
        <div className="card-body">
          <div className="subheader">{label}</div>
          <div className="h1 mb-0">{formatMoney(value)}</div>
        </div>
      </div>
    </div>
  )
}
