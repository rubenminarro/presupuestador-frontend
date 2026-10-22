import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconBan, IconCash, IconPackageImport, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_PAYMENT_STATUS } from '@/features/invoices/api'
import { PAYMENT_STATUS } from '@/features/payments/api'
import { PurchaseFormModal, PurchaseItemModal } from '@/features/purchases/PurchaseModals'
import { PURCHASE_STATUS, purchasesApi, type Purchase, type PurchaseItem } from '@/features/purchases/api'
import type { SupplierPayment } from '@/features/supplier-payments/api'
import { SupplierPaymentDetailModal } from '@/features/supplier-payments/SupplierPaymentDetailModal'
import { SupplierPaymentFormModal } from '@/features/supplier-payments/SupplierPaymentFormModal'
import { formatDate, formatDateTime, formatGuarani, formatMoney, formatQuantity } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

export function PurchaseDetailPage() {
  const { id } = useParams()
  const purchaseId = Number(id)

  const query = useQuery({
    queryKey: ['purchases', 'detail', purchaseId],
    queryFn: () => purchasesApi.show(purchaseId),
    enabled: Number.isInteger(purchaseId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Compras" title="Compra" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <PurchaseDetail purchase={query.data} />
}

// Recibir y anular mueven stock: se refrescan también inventario y repuestos.
const STOCK_INVALIDATE = [['purchases'], ['inventory'], ['parts'], ['supplier-payments']]

/** Compra `draft → received → cancelled`. Solo el borrador se edita; recibida, solo se anula (sin pagos vigentes). */
function PurchaseDetail({ purchase }: { purchase: Purchase }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'edit' | 'receive' | 'cancel' | 'delete' | 'pay' | null>(null)
  const status = purchase.status.value
  const draft = status === 'draft'
  const received = status === 'received'

  const receive = useApiMutation(() => purchasesApi.receive(purchase.id), {
    invalidate: STOCK_INVALIDATE,
    successMessage: 'Compra recibida: el stock ingresó al inventario.',
    onSuccess: () => setDialog(null),
  })
  const cancel = useApiMutation((reason: string) => purchasesApi.cancel(purchase.id, reason), {
    invalidate: STOCK_INVALIDATE,
    successMessage: 'Compra anulada: el stock fue revertido.',
    onSuccess: () => setDialog(null),
  })

  return (
    <>
      <PageHeader
        pretitle={`Compra · ${purchase.condition.label}`}
        title={`${purchase.code} · ${purchase.supplier?.name ?? 'Proveedor'}`}
        actions={
          <>
            <Link to="/purchases" className="btn btn-link">
              <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
              Compras
            </Link>
            {draft && can('purchases.update') && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setDialog('edit')}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar datos
              </button>
            )}
            {draft && can('purchases.receive') && (
              <button type="button" className="btn btn-outline-success" onClick={() => setDialog('receive')}>
                <IconPackageImport size={18} className="me-1" aria-hidden="true" />
                Recibir
              </button>
            )}
            {received && can('purchases.cancel') && (
              <button type="button" className="btn btn-outline-danger" onClick={() => setDialog('cancel')}>
                <IconBan size={18} className="me-1" aria-hidden="true" />
                Anular
              </button>
            )}
            {draft && can('purchases.destroy') && (
              <button type="button" className="btn btn-outline-danger" onClick={() => setDialog('delete')}>
                <IconTrash size={18} className="me-1" aria-hidden="true" />
                Eliminar
              </button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="row row-cards">
          <div className="col-12 col-lg-4">
            <PurchaseDataCard purchase={purchase} />
            <TotalsCard purchase={purchase} />
            {received && (
              <div className="card mt-3">
                <div className="card-header">
                  <h3 className="card-title">Pago al proveedor</h3>
                  <div className="card-actions">
                    <StatusBadge value={purchase.payment_summary.status} map={INVOICE_PAYMENT_STATUS} />
                  </div>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-6 fw-normal">Pagado</dt>
                    <dd className="col-6 text-end">{formatGuarani(purchase.payment_summary.paid_total)}</dd>
                    <dt className="col-6 h3 mb-0">Saldo</dt>
                    <dd className="col-6 text-end h3 mb-0">{formatGuarani(purchase.payment_summary.balance)}</dd>
                  </dl>
                  {purchase.payment_summary.status !== 'paid' && can('supplier-payments.store') && (
                    <button type="button" className="btn btn-primary w-100 mt-3" onClick={() => setDialog('pay')}>
                      <IconCash size={18} className="me-1" aria-hidden="true" />
                      Registrar pago
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="col-12 col-lg-8">
            <PurchaseItemsTable purchase={purchase} />
            {(purchase.payments?.length ?? 0) > 0 && (
              <div className="mt-3">
                <PurchasePaymentsTable payments={purchase.payments ?? []} />
              </div>
            )}
          </div>
        </div>
      </PageBody>

      {dialog === 'edit' && <PurchaseFormModal purchase={purchase} onClose={() => setDialog(null)} />}
      {dialog === 'pay' && <SupplierPaymentFormModal purchase={purchase} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog === 'receive'}
        title="Recibir compra"
        message={
          <>
            ¿Recibir <strong>{purchase.code}</strong>? Ingresa al stock cada línea a su costo sin IVA, actualiza el último costo
            del proveedor y la compra ya no se puede modificar: solo anular. Requiere número y fecha de la factura (y
            vencimiento si es a crédito).
          </>
        }
        confirmLabel="Recibir"
        isLoading={receive.isPending}
        onConfirm={() => receive.mutate()}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'cancel'}
        title="Anular compra"
        message={
          <>
            ¿Anular <strong>{purchase.code}</strong>? Retira del stock lo que ingresó (si no hay disponible suficiente, no se puede).
            Si tiene pagos vigentes, primero hay que anularlos.
          </>
        }
        confirmLabel="Anular compra"
        variant="danger"
        reason={{ label: 'Motivo de la anulación' }}
        isLoading={cancel.isPending}
        error={cancel.error}
        onConfirm={(reason) => cancel.mutate(reason ?? '')}
        onClose={() => setDialog(null)}
      />
      {dialog === 'delete' && (
        <DeleteDialog
          title="Eliminar borrador"
          message={
            <>
              ¿Eliminar el borrador <strong>{purchase.code}</strong> con sus líneas?
            </>
          }
          onDelete={() => purchasesApi.remove(purchase.id)}
          invalidate={[['purchases']]}
          successMessage="Borrador eliminado."
          onClose={() => setDialog(null)}
          onDeleted={() => navigate('/purchases', { replace: true })}
        />
      )}
    </>
  )
}

function PurchaseDataCard({ purchase }: { purchase: Purchase }) {
  const document = purchase.supplier_document

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Compra</h3>
        <div className="card-actions">
          <StatusBadge value={purchase.status.value} map={PURCHASE_STATUS} />
        </div>
      </div>
      <div className="card-body">
        <dl className="row mb-0">
          <dt className="col-5">Proveedor</dt>
          <dd className="col-7">
            {purchase.supplier?.name ?? '—'}
            {purchase.supplier?.tax_id && <div className="small text-secondary">{purchase.supplier.tax_id}</div>}
          </dd>
          <dt className="col-5">Factura</dt>
          <dd className="col-7">
            {document.number ?? <span className="text-warning">Sin número</span>}
            {document.stamp_number && <div className="small text-secondary">Timbrado {document.stamp_number}</div>}
          </dd>
          <dt className="col-5">Fecha</dt>
          <dd className="col-7">{document.date ? formatDate(document.date) : <span className="text-warning">Sin fecha</span>}</dd>
          <dt className="col-5">Condición</dt>
          <dd className="col-7">{purchase.condition.label}</dd>
          {purchase.condition.value === 'credit' && (
            <>
              <dt className="col-5">Vencimiento</dt>
              <dd className="col-7">{formatDate(purchase.due_date)}</dd>
            </>
          )}
          {purchase.received_at && (
            <>
              <dt className="col-5">Recibida</dt>
              <dd className="col-7">{formatDateTime(purchase.received_at)}</dd>
            </>
          )}
          {purchase.notes && (
            <>
              <dt className="col-12">Notas</dt>
              <dd className="col-12" style={{ whiteSpace: 'pre-line' }}>
                {purchase.notes}
              </dd>
            </>
          )}
          {purchase.status.value === 'cancelled' && (
            <>
              <dt className="col-12 text-red">Anulada el {formatDateTime(purchase.cancelled_at)}</dt>
              <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                {purchase.cancellation_reason}
              </dd>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}

/** Totales por tasa e IVA de la factura del proveedor, calculados por el backend. */
function TotalsCard({ purchase }: { purchase: Purchase }) {
  const totals = purchase.totals
  const rows: [string, string | null][] = [
    ['Exentas', totals.exempt],
    ['Gravadas 5%', totals.taxed_5],
    ['Gravadas 10%', totals.taxed_10],
    ['IVA 5%', totals.iva_5],
    ['IVA 10%', totals.iva_10],
  ]

  return (
    <div className="card mt-3">
      <div className="card-body">
        <dl className="row mb-0">
          {rows.map(([label, value]) => (
            <div key={label} className="col-12 d-flex justify-content-between">
              <span>{label}</span>
              <span>{formatGuarani(value)}</span>
            </div>
          ))}
          <dt className="col-6 h3 mb-0 mt-2">Total</dt>
          <dd className="col-6 text-end h3 mb-0 mt-2">{formatGuarani(totals.total)}</dd>
          <dd className="col-12 small text-secondary mb-0">
            IVA incluido · al inventario sin IVA: {formatGuarani(totals.net_total)}
          </dd>
        </dl>
      </div>
    </div>
  )
}

function PurchaseItemsTable({ purchase }: { purchase: Purchase }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<PurchaseItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<PurchaseItem | null>(null)
  const editable = purchase.status.value === 'draft' && can('purchases.update')

  const columns: Column<PurchaseItem>[] = [
    {
      key: 'part',
      header: 'Repuesto',
      render: (item) => (
        <>
          <div>{item.part?.name ?? '—'}</div>
          <div className="small text-secondary">{[item.part?.code, item.part?.sku].filter(Boolean).join(' · ')}</div>
        </>
      ),
    },
    { key: 'quantity', header: 'Cant.', className: 'text-end', render: (item) => formatQuantity(item.quantity) },
    {
      key: 'cost',
      header: 'Costo unit.',
      className: 'text-end text-nowrap',
      render: (item) => (
        <>
          <div>{formatGuarani(item.unit_cost)}</div>
          <div className="small text-secondary">sin IVA {formatMoney(item.net_unit_cost)}</div>
        </>
      ),
    },
    { key: 'tax', header: 'IVA', className: 'text-nowrap', render: (item) => item.tax_rate.label },
    { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (item) => formatGuarani(item.total) },
    ...(editable
      ? [
          {
            key: 'actions',
            header: <span className="visually-hidden">Acciones</span>,
            className: 'w-1 text-nowrap',
            render: (item: PurchaseItem) => (
              <>
                <IconButton label={`Editar ${item.part?.name ?? 'línea'}`} icon={IconPencil} onClick={() => setEditing(item)} />
                <IconButton label={`Eliminar ${item.part?.name ?? 'línea'}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(item)} />
              </>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <DataTable
        title="Líneas (costos con IVA incluido)"
        columns={columns}
        rows={purchase.items ?? []}
        rowKey={(item) => item.id}
        emptyMessage={editable ? 'Agregue los repuestos de la factura del proveedor.' : 'La compra no tiene líneas.'}
        toolbar={
          editable && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Agregar línea
            </button>
          )
        }
      />
      {editing && <PurchaseItemModal purchase={purchase} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar línea"
          message={
            <>
              ¿Eliminar <strong>{deleting.part?.name ?? 'la línea'}</strong> de la compra?
            </>
          }
          onDelete={() => purchasesApi.removeItem(purchase.id, deleting.id)}
          invalidate={[['purchases']]}
          successMessage="Línea eliminada."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function PurchasePaymentsTable({ payments }: { payments: SupplierPayment[] }) {
  const { can } = useAuth()
  const [selected, setSelected] = useState<SupplierPayment | null>(null)

  const columns: Column<SupplierPayment>[] = [
    { key: 'code', header: 'Pago', className: 'text-nowrap', render: (payment) => <span className="text-secondary">{payment.code}</span> },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (payment) => formatDate(payment.payment_date) },
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
      <DataTable
        title="Pagos al proveedor"
        columns={columns}
        rows={payments}
        rowKey={(payment) => payment.id}
        onRowClick={can('supplier-payments.show') ? setSelected : undefined}
      />
      {selected && <SupplierPaymentDetailModal paymentId={selected.id} onClose={() => setSelected(null)} />}
    </>
  )
}
