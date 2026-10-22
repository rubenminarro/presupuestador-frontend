import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { DIAGNOSTIC_STATUS, diagnosticsApi, PRIORITY, type DiagnosticSummary } from '@/features/diagnostics/api'
import { formatDateTime } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

/** Los diagnósticos se crean desde la ficha de la recepción. */
export function DiagnosticsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')

  const params = { ...list.params, status, priority }
  const query = useQuery({
    queryKey: ['diagnostics', params],
    queryFn: () => diagnosticsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filterSelect = (label: string, value: string, setter: (value: string) => void, map: typeof PRIORITY, all: string) => (
    <select
      className="form-select form-select-sm w-auto"
      aria-label={label}
      value={value}
      onChange={(event) => {
        setter(event.target.value)
        list.setPage(1)
      }}
    >
      <option value="">{all}</option>
      {Object.entries(map).map(([optionValue, { label: optionLabel }]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  )

  const columns: Column<DiagnosticSummary>[] = [
    { key: 'id', header: 'N.º', className: 'text-nowrap', render: (diagnostic) => <span className="text-secondary">#{diagnostic.id}</span> },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (diagnostic) => formatDateTime(diagnostic.diagnosed_at) },
    {
      key: 'reception',
      header: 'Recepción',
      className: 'text-nowrap',
      render: (diagnostic) =>
        can('receptions.show') ? (
          <Link to={`/receptions/${diagnostic.reception_id}`} onClick={(event) => event.stopPropagation()}>
            #{diagnostic.reception_id}
          </Link>
        ) : (
          `#${diagnostic.reception_id}`
        ),
    },
    {
      key: 'vehicle',
      header: 'Vehículo / cliente',
      render: (diagnostic) => (
        <>
          <div>
            {diagnostic.reception?.vehicle?.plate ?? 'Sin chapa'}
            <span className="text-secondary ms-1">
              {[diagnostic.reception?.vehicle?.brand, diagnostic.reception?.vehicle?.model].filter(Boolean).join(' ')}
            </span>
          </div>
          <div className="small text-secondary">{diagnostic.reception?.client?.full_name}</div>
        </>
      ),
    },
    {
      key: 'diagnosis',
      header: 'Diagnóstico',
      render: (diagnostic) => (
        <span className="text-truncate d-inline-block" style={{ maxWidth: '18rem' }}>
          {diagnostic.diagnosis ?? diagnostic.customer_complaint ?? '—'}
        </span>
      ),
    },
    {
      key: 'mechanic',
      header: 'Mecánico',
      render: (diagnostic) => (diagnostic.mechanic ? `${diagnostic.mechanic.first_name} ${diagnostic.mechanic.last_name}` : '—'),
    },
    { key: 'priority', header: 'Prioridad', render: (diagnostic) => <StatusBadge value={diagnostic.priority} map={PRIORITY} /> },
    { key: 'status', header: 'Estado', render: (diagnostic) => <StatusBadge value={diagnostic.status} map={DIAGNOSTIC_STATUS} /> },
  ]

  return (
    <>
      <PageHeader pretitle="Taller" title="Diagnósticos" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(diagnostic) => diagnostic.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          onRowClick={can('diagnostics.show') ? (diagnostic) => navigate(`/diagnostics/${diagnostic.id}`) : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'N.º, cliente, chapa, mecánico o texto…' }}
          toolbar={
            <>
              {filterSelect('Filtrar por estado', status, setStatus, DIAGNOSTIC_STATUS, 'Todos los estados')}
              {filterSelect('Filtrar por prioridad', priority, setPriority, PRIORITY, 'Todas las prioridades')}
            </>
          }
        />
      </PageBody>
    </>
  )
}
