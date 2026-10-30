import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { CLAIM_STATUS, claimsApi, type ClaimSummary } from '@/features/claims/api'
import { insurersApi } from '@/features/insurers/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

/** Siniestros (M3): consulta. El alta es desde la recepción del vehículo. */
export function ClaimsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [insurerId, setInsurerId] = useState('')
  const [status, setStatus] = useState('')

  const params = { ...list.params, insurer_id: insurerId, status }
  const query = useQuery({
    queryKey: ['claims', params],
    queryFn: () => claimsApi.list(params),
    placeholderData: keepPreviousData,
  })
  const insurers = useQuery({
    queryKey: ['insurers', 'options'],
    queryFn: () => insurersApi.list({ per_page: 100 }),
    enabled: can('insurers.index'),
  })

  const columns: Column<ClaimSummary>[] = [
    {
      key: 'code',
      header: 'Siniestro',
      className: 'text-nowrap',
      render: (claim) => (
        <>
          <strong>{claim.code}</strong>
          {claim.claim_number && <div className="small text-secondary">N.º {claim.claim_number}</div>}
        </>
      ),
    },
    { key: 'plate', header: 'Vehículo', className: 'text-nowrap', render: (claim) => claim.plate ?? '—' },
    { key: 'insurer', header: 'Aseguradora', render: (claim) => claim.insurer?.name ?? '—' },
    {
      key: 'insured',
      header: 'Asegurado',
      render: (claim) => (
        <>
          {claim.insured_name ?? '—'}
          <div className="small text-secondary">{claim.claim_type.label}</div>
        </>
      ),
    },
    { key: 'loss_date', header: 'Fecha', className: 'text-nowrap', render: (claim) => formatDate(claim.loss_date) },
    {
      key: 'deductible',
      header: 'Deducible',
      className: 'text-end text-nowrap',
      render: (claim) => (claim.deductible_amount === null ? <span className="text-secondary">Desconocido</span> : formatMoney(claim.deductible_amount)),
    },
    { key: 'status', header: 'Estado', render: (claim) => <StatusBadge value={claim.status.value} map={CLAIM_STATUS} /> },
  ]

  return (
    <>
      <PageHeader pretitle="Taller" title="Siniestros" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(claim) => claim.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          emptyMessage="No hay siniestros. Se registran desde la recepción del vehículo."
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar por código, número, póliza, asegurado o placa…' }}
          toolbar={
            <>
              {insurers.data && (
                <select
                  className="form-select form-select-sm w-auto"
                  aria-label="Filtrar por aseguradora"
                  value={insurerId}
                  onChange={(event) => {
                    setInsurerId(event.target.value)
                    list.setPage(1)
                  }}
                >
                  <option value="">Todas las aseguradoras</option>
                  {insurers.data.items.map((insurer) => (
                    <option key={insurer.id} value={insurer.id}>
                      {insurer.client?.display_name ?? insurer.code}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  list.setPage(1)
                }}
              >
                <option value="">Todos los estados</option>
                {Object.entries(CLAIM_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          }
          onRowClick={can('claims.show') ? (claim) => navigate(`/claims/${claim.id}`) : undefined}
        />
      </PageBody>
    </>
  )
}
