import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPlus } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_PAYMENT_STATUS } from '@/features/invoices/api'
import { PurchaseFormModal } from '@/features/purchases/PurchaseModals'
import { PURCHASE_STATUS, purchasesApi, type PurchaseSummary } from '@/features/purchases/api'
import { useAllSuppliers } from '@/features/suppliers/api'
import { formatDate, formatGuarani } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

/** Compras a proveedores: costos con IVA incluido; al recibirlas entra el stock al costo sin IVA. */
export function PurchasesPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [creating, setCreating] = useState(false)
  const suppliers = useAllSuppliers({ enabled: can('suppliers.index') })

  const params = { ...list.params, status, supplier_id: supplierId, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: ['purchases', params],
    queryFn: () => purchasesApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  const columns: Column<PurchaseSummary>[] = [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (purchase) => <span className="text-secondary">{purchase.code}</span> },
    {
      key: 'document',
      header: 'Factura del proveedor',
      render: (purchase) => (
        <>
          <div>{purchase.supplier_name ?? `Proveedor #${purchase.supplier_id}`}</div>
          <div className="small text-secondary">
            {[purchase.supplier_document_number ?? 'Sin número', formatDate(purchase.supplier_document_date), purchase.condition.label].join(' · ')}
          </div>
        </>
      ),
    },
    { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (purchase) => formatGuarani(purchase.total) },
    {
      key: 'balance',
      header: 'Saldo',
      className: 'text-end text-nowrap',
      render: (purchase) => (purchase.status.value === 'received' ? formatGuarani(purchase.balance) : '—'),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (purchase) => (
        <div className="d-flex flex-wrap gap-1">
          <StatusBadge value={purchase.status.value} map={PURCHASE_STATUS} />
          {purchase.payment_status && <StatusBadge value={purchase.payment_status} map={INVOICE_PAYMENT_STATUS} />}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Inventario"
        title="Compras"
        actions={
          can('purchases.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nueva compra
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(purchase) => purchase.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          emptyMessage="No hay compras."
          onRowClick={can('purchases.show') ? (purchase) => navigate(`/purchases/${purchase.id}`) : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Código o número de factura…' }}
          toolbar={
            <>
              {suppliers.data && (
                <select
                  className="form-select form-select-sm w-auto"
                  aria-label="Filtrar por proveedor"
                  value={supplierId}
                  onChange={(event) => filter(setSupplierId)(event.target.value)}
                >
                  <option value="">Todos los proveedores</option>
                  {suppliers.data.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter(setStatus)(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(PURCHASE_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Factura desde"
                title="Factura desde"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => filter(setDateFrom)(event.target.value)}
              />
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Factura hasta"
                title="Factura hasta"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => filter(setDateTo)(event.target.value)}
              />
            </>
          }
        />
        <div className="small text-secondary mt-2">Importes en guaraníes, con IVA incluido.</div>
      </PageBody>
      {creating && (
        <PurchaseFormModal
          purchase={null}
          onClose={() => setCreating(false)}
          onSaved={(created) => (can('purchases.show') ? navigate(`/purchases/${created.id}`) : undefined)}
        />
      )}
    </>
  )
}
