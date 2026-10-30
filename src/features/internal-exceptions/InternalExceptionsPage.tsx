import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { INTERNAL_EXCEPTION_TYPES, internalExceptionsApi, type ExceptionDocument, type InternalException } from '@/features/internal-exceptions/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

function documentLink(document: ExceptionDocument) {
  const path = document.type === 'budget' ? 'budgets' : document.type === 'work_order' ? 'work-orders' : null
  const label = document.code ?? `#${document.id}`
  return path ? <Link to={`/${path}/${document.id}`}>{label}</Link> : label
}

/** Excepciones internas (M7): consulta. Se otorgan en contexto (presupuesto; la absorción, en el reparto). */
export function InternalExceptionsPage() {
  const list = useListParams()
  const [type, setType] = useState('')
  const [consumed, setConsumed] = useState('')

  const params = { page: list.params.page, per_page: list.params.per_page, type, consumed }
  const query = useQuery({
    queryKey: ['internal-exceptions', params],
    queryFn: () => internalExceptionsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<InternalException>[] = [
    { key: 'type', header: 'Tipo', render: (exception) => exception.type.label },
    { key: 'subject', header: 'Sobre', className: 'text-nowrap', render: (exception) => documentLink(exception.subject) },
    {
      key: 'reason',
      header: 'Motivo',
      render: (exception) => (
        <>
          {exception.reason}
          {exception.amount !== null && <div className="small text-secondary">Importe: {formatMoney(exception.amount)} (sin IVA)</div>}
        </>
      ),
    },
    {
      key: 'granted',
      header: 'Otorgada',
      className: 'text-nowrap',
      render: (exception) => (
        <>
          {formatDateTime(exception.granted_at)}
          {exception.granted_by && <div className="small text-secondary">{exception.granted_by.name}</div>}
        </>
      ),
    },
    {
      key: 'consumed',
      header: 'Uso',
      className: 'text-nowrap',
      render: (exception) =>
        exception.consumed_at ? (
          <>
            <span className="badge bg-secondary-lt">Usada</span>
            <div className="small text-secondary">
              {formatDateTime(exception.consumed_at)}
              {exception.consumed_by && <> · {documentLink(exception.consumed_by)}</>}
            </div>
          </>
        ) : (
          <span className="badge bg-green-lt">Disponible</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader pretitle="Taller" title="Excepciones internas" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(exception) => exception.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          emptyMessage="No hay excepciones otorgadas."
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por tipo"
                value={type}
                onChange={(event) => {
                  setType(event.target.value)
                  list.setPage(1)
                }}
              >
                <option value="">Todos los tipos</option>
                {Object.entries(INTERNAL_EXCEPTION_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por uso"
                value={consumed}
                onChange={(event) => {
                  setConsumed(event.target.value)
                  list.setPage(1)
                }}
              >
                <option value="">Usadas y disponibles</option>
                <option value="0">Disponibles</option>
                <option value="1">Usadas</option>
              </select>
            </>
          }
        />
      </PageBody>
    </>
  )
}
