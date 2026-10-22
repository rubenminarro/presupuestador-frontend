import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { PAYMENT_METHODS, PAYMENT_STATUS, paymentsApi, type Payment } from '@/features/payments/api'
import { PaymentDetailModal } from '@/features/payments/PaymentDetailModal'
import { formatDate, formatGuarani } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

/** Pagos de facturas emitidas. Se registran desde la factura; acá se consultan, se anulan y se baja el recibo. */
export function PaymentsPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<Payment | null>(null)

  const params = { ...list.params, method, status, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  const columns: Column<Payment>[] = [
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (payment) => formatDate(payment.payment_date) },
    {
      key: 'invoice',
      header: 'Factura / cliente',
      render: (payment) => (
        <>
          <div className="text-nowrap">
            {can('invoices.show') && payment.invoice_id ? (
              <Link to={`/invoices/${payment.invoice_id}`} onClick={(event) => event.stopPropagation()}>
                {payment.invoice_number ?? `#${payment.invoice_id}`}
              </Link>
            ) : (
              (payment.invoice_number ?? '—')
            )}
          </div>
          {payment.customer_name && <div className="small text-secondary">{payment.customer_name}</div>}
        </>
      ),
    },
    { key: 'receipt', header: 'Recibo', className: 'text-nowrap', render: (payment) => payment.receipt_number ?? '—' },
    {
      key: 'method',
      header: 'Medio',
      render: (payment) => (
        <>
          <div>{payment.method.label}</div>
          {payment.reference && <div className="small text-secondary">{payment.reference}</div>}
        </>
      ),
    },
    { key: 'amount', header: 'Monto', className: 'text-end text-nowrap', render: (payment) => formatGuarani(payment.amount) },
    { key: 'status', header: 'Estado', render: (payment) => <StatusBadge value={payment.status.value} map={PAYMENT_STATUS} /> },
  ]

  return (
    <>
      <PageHeader pretitle="Caja" title="Cobros" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(payment) => payment.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          emptyMessage="No hay pagos: se registran desde una factura emitida."
          onRowClick={can('payments.show') ? setSelected : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Recibo, referencia, factura o cliente…' }}
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por medio de pago"
                value={method}
                onChange={(event) => filter(setMethod)(event.target.value)}
              >
                <option value="">Todos los medios</option>
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter(setStatus)(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(PAYMENT_STATUS).map(([value, { label }]) => (
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
      {selected && <PaymentDetailModal paymentId={selected.id} onClose={() => setSelected(null)} />}
    </>
  )
}
