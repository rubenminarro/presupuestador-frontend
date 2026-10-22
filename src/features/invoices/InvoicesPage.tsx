import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_PAYMENT_STATUS, INVOICE_STATUS, invoicesApi, type InvoiceSummary } from '@/features/invoices/api'
import { formatDate, formatGuarani } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

/** Las facturas se generan desde una OT completada. Importes con IVA incluido. */
export function InvoicesPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const params = { ...list.params, status, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => invoicesApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  const columns: Column<InvoiceSummary>[] = [
    {
      key: 'number',
      header: 'Número',
      className: 'text-nowrap',
      render: (invoice) => invoice.number ?? <span className="text-secondary">Borrador #{invoice.id}</span>,
    },
    { key: 'date', header: 'Emisión', className: 'text-nowrap', render: (invoice) => formatDate(invoice.issue_date) },
    {
      key: 'customer',
      header: 'Cliente',
      render: (invoice) => (
        <>
          <div>{invoice.customer_name}</div>
          <div className="small text-secondary">
            {[invoice.customer_tax_id, invoice.condition.label].filter(Boolean).join(' · ')}
            {invoice.work_order_code && (
              <>
                {' · '}
                {can('work-orders.show') ? (
                  <Link to={`/work-orders/${invoice.work_order_id}`} onClick={(event) => event.stopPropagation()}>
                    {invoice.work_order_code}
                  </Link>
                ) : (
                  invoice.work_order_code
                )}
              </>
            )}
          </div>
        </>
      ),
    },
    { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (invoice) => formatGuarani(invoice.total) },
    {
      key: 'balance',
      header: 'Saldo',
      className: 'text-end text-nowrap',
      render: (invoice) => (invoice.status.value === 'issued' ? formatGuarani(invoice.balance) : '—'),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (invoice) => (
        <div className="d-flex flex-wrap gap-1">
          <StatusBadge value={invoice.status.value} map={INVOICE_STATUS} />
          {invoice.payment_status && <StatusBadge value={invoice.payment_status} map={INVOICE_PAYMENT_STATUS} />}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader pretitle="Caja" title="Facturas" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(invoice) => invoice.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          emptyMessage="No hay facturas: se generan desde una orden de trabajo completada."
          onRowClick={can('invoices.show') ? (invoice) => navigate(`/invoices/${invoice.id}`) : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Número, cliente o RUC/CI…' }}
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter(setStatus)(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(INVOICE_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Emitida desde"
                title="Emitida desde"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => filter(setDateFrom)(event.target.value)}
              />
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Emitida hasta"
                title="Emitida hasta"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => filter(setDateTo)(event.target.value)}
              />
            </>
          }
        />
        <div className="small text-secondary mt-2">Importes en guaraníes, con IVA incluido.</div>
      </PageBody>
    </>
  )
}
