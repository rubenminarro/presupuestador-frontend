import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { PAYMENT_METHODS, PAYMENT_STATUS } from '@/features/payments/api'
import { supplierPaymentsApi, type SupplierPayment } from '@/features/supplier-payments/api'
import { SupplierPaymentDetailModal } from '@/features/supplier-payments/SupplierPaymentDetailModal'
import { formatDate, formatGuarani } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

/** Pagos a proveedores. Se registran desde la compra recibida; acá se consultan y se anulan. */
export function SupplierPaymentsPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<SupplierPayment | null>(null)

  const params = { ...list.params, method, status, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: ['supplier-payments', params],
    queryFn: () => supplierPaymentsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  const columns: Column<SupplierPayment>[] = [
    { key: 'code', header: 'Pago', className: 'text-nowrap', render: (payment) => <span className="text-secondary">{payment.code}</span> },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (payment) => formatDate(payment.payment_date) },
    {
      key: 'supplier',
      header: 'Proveedor / compra',
      render: (payment) => (
        <>
          <div>{payment.supplier_name ?? '—'}</div>
          <div className="small text-secondary">
            {can('purchases.show') && payment.purchase_id ? (
              <Link to={`/purchases/${payment.purchase_id}`} onClick={(event) => event.stopPropagation()}>
                {payment.purchase_code ?? `#${payment.purchase_id}`}
              </Link>
            ) : (
              payment.purchase_code
            )}
          </div>
        </>
      ),
    },
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
      <PageHeader pretitle="Caja" title="Pagos a proveedores" />
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
          emptyMessage="No hay pagos a proveedores: se registran desde una compra recibida."
          onRowClick={can('supplier-payments.show') ? setSelected : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Pago, referencia, recibo, compra o factura…' }}
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
      {selected && <SupplierPaymentDetailModal paymentId={selected.id} onClose={() => setSelected(null)} />}
    </>
  )
}
