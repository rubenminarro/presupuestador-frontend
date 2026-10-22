import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_CONDITIONS, INVOICE_PAYMENT_STATUS } from '@/features/invoices/api'
import { purchasesApi, type AccountsPayable } from '@/features/purchases/api'
import { formatDate, formatGuarani } from '@/lib/format'

/** Cuentas por pagar a hoy: saldos de compras recibidas por proveedor, vencido (rojo) y por vencer. */
export function AccountsPayablePage() {
  const [open, setOpen] = useState<number | null>(null)
  const query = useQuery({ queryKey: ['purchases', 'accounts-payable'], queryFn: () => purchasesApi.accountsPayable() })
  const data = query.data

  return (
    <>
      <PageHeader pretitle="Caja" title="Cuentas por pagar" />
      <PageBody>
        {!data ? (
          <div className="card">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
        ) : (
          <>
            <p className="text-secondary">Al {formatDate(data.as_of)} · compras recibidas con saldo, en guaraníes (IVA incluido).</p>
            <div className="row row-cards mb-3">
              {(
                [
                  ['Saldo total', data.balance, ''],
                  ['Vencido', data.overdue, 'text-red'],
                  ['Por vencer', data.not_due, ''],
                ] as const
              ).map(([label, value, className]) => (
                <div key={label} className="col-12 col-md-4">
                  <div className="card">
                    <div className="card-body">
                      <div className="subheader">{label}</div>
                      <div className={`h1 mb-0 ${className}`}>{formatGuarani(value)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              {data.suppliers.length === 0 ? (
                <EmptyState message="No hay saldos pendientes con proveedores." />
              ) : (
                <div className="table-responsive">
                  <table className="table card-table table-vcenter">
                    <thead>
                      <tr>
                        <th className="w-1" />
                        <th>Proveedor</th>
                        <th className="text-end">Compras</th>
                        <th>Vence primero</th>
                        <th className="text-end">Vencido</th>
                        <th className="text-end">Por vencer</th>
                        <th className="text-end">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.suppliers.map((supplier) => {
                        const expanded = open === supplier.supplier_id
                        return (
                          <Fragment key={supplier.supplier_id}>
                            <tr className="cursor-pointer" onClick={() => setOpen(expanded ? null : supplier.supplier_id)}>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-icon btn-ghost-secondary"
                                  aria-expanded={expanded}
                                  aria-label={`${expanded ? 'Ocultar' : 'Ver'} compras de ${supplier.name}`}
                                >
                                  {expanded ? <IconChevronDown size={16} aria-hidden="true" /> : <IconChevronRight size={16} aria-hidden="true" />}
                                </button>
                              </td>
                              <td>
                                {supplier.name}
                                {supplier.tax_id && <div className="small text-secondary">{supplier.tax_id}</div>}
                              </td>
                              <td className="text-end">{supplier.purchases_count}</td>
                              <td className="text-nowrap">{formatDate(supplier.oldest_due_date)}</td>
                              <td className={`text-end text-nowrap ${Number(supplier.overdue) > 0 ? 'text-red' : ''}`}>{formatGuarani(supplier.overdue)}</td>
                              <td className="text-end text-nowrap">{formatGuarani(supplier.not_due)}</td>
                              <td className="text-end text-nowrap fw-bold">{formatGuarani(supplier.balance)}</td>
                            </tr>
                            {expanded && (
                              <tr>
                                <td colSpan={7} className="bg-body-tertiary">
                                  <SupplierPurchases supplierId={supplier.supplier_id} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </PageBody>
    </>
  )
}

/** Detalle de las compras con saldo de un proveedor (`accounts-payable?supplier_id=`). */
function SupplierPurchases({ supplierId }: { supplierId: number }) {
  const { can } = useAuth()
  const query = useQuery({ queryKey: ['purchases', 'accounts-payable', supplierId], queryFn: () => purchasesApi.accountsPayable(supplierId) })
  const purchases: NonNullable<AccountsPayable['suppliers'][number]['purchases']> = query.data?.suppliers[0]?.purchases ?? []

  if (!query.data) return query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />

  return (
    <div className="table-responsive">
      <table className="table table-sm table-vcenter mb-0">
        <thead>
          <tr>
            <th>Compra</th>
            <th>Factura</th>
            <th>Vence</th>
            <th className="text-end">Total</th>
            <th className="text-end">Pagado</th>
            <th className="text-end">Saldo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td className="text-nowrap">{can('purchases.show') ? <Link to={`/purchases/${purchase.id}`}>{purchase.code}</Link> : purchase.code}</td>
              <td>
                {purchase.supplier_document_number ?? '—'}
                <div className="small text-secondary">
                  {formatDate(purchase.supplier_document_date)} · {INVOICE_CONDITIONS[purchase.condition]}
                </div>
              </td>
              <td className="text-nowrap">
                {formatDate(purchase.due_date)}
                {purchase.days_overdue > 0 && <div className="small text-red">Vencida hace {purchase.days_overdue} día(s)</div>}
              </td>
              <td className="text-end text-nowrap">{formatGuarani(purchase.total)}</td>
              <td className="text-end text-nowrap">{formatGuarani(purchase.paid_total)}</td>
              <td className="text-end text-nowrap fw-bold">{formatGuarani(purchase.balance)}</td>
              <td>
                <StatusBadge value={purchase.payment_status} map={INVOICE_PAYMENT_STATUS} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
