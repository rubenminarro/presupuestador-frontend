import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPlus } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INSURER_STATUS, insurersApi, type InsurerSummary } from '@/features/insurers/api'
import { NewInsurerModal } from '@/features/insurers/InsurerFormModals'
import { useCreateParam } from '@/lib/useCreateParam'
import { useListParams } from '@/lib/useListParams'

/** Aseguradoras (M2): cada una vinculada a un cliente empresa, destinatario de sus facturas. */
export function InsurersPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useCreateParam(can('insurers.store'))

  const params = { ...list.params, status }
  const query = useQuery({
    queryKey: ['insurers', params],
    queryFn: () => insurersApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<InsurerSummary>[] = [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (insurer) => <span className="text-secondary">{insurer.code}</span> },
    {
      key: 'name',
      header: 'Aseguradora',
      render: (insurer) => (
        <>
          <strong>{insurer.client?.display_name ?? '—'}</strong>
          {insurer.client && <div className="small text-secondary">{insurer.client.document_number}</div>}
        </>
      ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (insurer) => (insurer.client ? [insurer.client.phone, insurer.client.email].filter(Boolean).join(' · ') : '—'),
    },
    {
      key: 'term',
      header: 'Plazo de pago',
      className: 'text-nowrap',
      render: (insurer) => (insurer.payment_term_days === null ? '30 días (predeterminado)' : `${insurer.payment_term_days} días`),
    },
    { key: 'contacts', header: 'Contactos', className: 'text-end', render: (insurer) => insurer.contacts_count ?? '—' },
    { key: 'status', header: 'Estado', render: (insurer) => <StatusBadge value={insurer.status.value} map={INSURER_STATUS} /> },
  ]

  return (
    <>
      <PageHeader
        pretitle="Clientes"
        title="Aseguradoras"
        actions={
          can('insurers.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nueva aseguradora
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(insurer) => insurer.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          emptyMessage="No hay aseguradoras registradas."
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar por código, razón social o RUC…' }}
          toolbar={
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
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          }
          onRowClick={can('insurers.show') ? (insurer) => navigate(`/insurers/${insurer.id}`) : undefined}
        />
      </PageBody>
      {creating && <NewInsurerModal onClose={() => setCreating(false)} onSaved={(insurer) => navigate(`/insurers/${insurer.id}`)} />}
    </>
  )
}
