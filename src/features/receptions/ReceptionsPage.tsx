import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPlus } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { RECEPTION_STATUS, receptionsApi, receptionVehicleLabel, type ReceptionSummary } from '@/features/receptions/api'
import { ReceptionFormModal } from '@/features/receptions/ReceptionFormModal'
import { formatDate } from '@/lib/format'
import { useCreateParam } from '@/lib/useCreateParam'
import { useListParams } from '@/lib/useListParams'

export function ReceptionsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [creating, setCreating] = useCreateParam(can('receptions.store'))

  const params = { ...list.params, status, reception_start_date: dateFrom, reception_end_date: dateTo }
  const query = useQuery({
    queryKey: ['receptions', params],
    queryFn: () => receptionsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  const columns: Column<ReceptionSummary>[] = [
    { key: 'id', header: 'N.º', className: 'text-nowrap', render: (reception) => <span className="text-secondary">#{reception.id}</span> },
    { key: 'date', header: 'Ingreso', className: 'text-nowrap', render: (reception) => formatDate(reception.reception_date) },
    {
      key: 'client',
      header: 'Cliente',
      render: (reception) => (
        <>
          <div>{reception.client.full_name}</div>
          <div className="small text-secondary">{reception.client.document_number}</div>
        </>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehículo',
      render: (reception) => (
        <>
          <div>{receptionVehicleLabel(reception.vehicle)}</div>
          <div className="small text-secondary">{[reception.vehicle.brand, reception.vehicle.model].filter(Boolean).join(' ')}</div>
        </>
      ),
    },
    {
      key: 'problem',
      header: 'Problema',
      render: (reception) => <span className="text-truncate d-inline-block" style={{ maxWidth: '18rem' }}>{reception.problem_description ?? '—'}</span>,
    },
    { key: 'delivery', header: 'Entrega est.', className: 'text-nowrap', render: (reception) => formatDate(reception.estimated_delivery_date) },
    { key: 'status', header: 'Estado', render: (reception) => <StatusBadge value={reception.status.value} map={RECEPTION_STATUS} /> },
  ]

  return (
    <>
      <PageHeader
        pretitle="Taller"
        title="Recepciones"
        actions={
          can('receptions.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nueva recepción
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(reception) => reception.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          onRowClick={can('receptions.show') ? (reception) => navigate(`/receptions/${reception.id}`) : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'N.º, cliente, documento, chapa o problema…' }}
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter(setStatus)(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(RECEPTION_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Ingreso desde"
                title="Ingreso desde"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => filter(setDateFrom)(event.target.value)}
              />
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Ingreso hasta"
                title="Ingreso hasta"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => filter(setDateTo)(event.target.value)}
              />
            </>
          }
        />
      </PageBody>
      {creating && (
        <ReceptionFormModal
          reception={null}
          onClose={() => setCreating(false)}
          onCreated={can('receptions.show') ? (reception) => navigate(`/receptions/${reception.id}`) : undefined}
        />
      )}
    </>
  )
}
