import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconBan, IconCash, IconFileCheck, IconPencil, IconTrash } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { DownloadButton } from '@/components/ui/DownloadButton'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_PAYMENT_STATUS, INVOICE_STATUS, invoicesApi, type Invoice, type InvoiceItem } from '@/features/invoices/api'
import { EditInvoiceModal, InvoiceItemModal, IssueInvoiceModal } from '@/features/invoices/InvoiceModals'
import { PAYMENT_STATUS, type Payment } from '@/features/payments/api'
import { PaymentDetailModal } from '@/features/payments/PaymentDetailModal'
import { PaymentFormModal } from '@/features/payments/PaymentFormModal'
import { formatDate, formatDateTime, formatGuarani, formatQuantity } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const invoiceId = Number(id)

  const query = useQuery({
    queryKey: ['invoices', 'detail', invoiceId],
    queryFn: () => invoicesApi.show(invoiceId),
    enabled: Number.isInteger(invoiceId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Facturas" title="Factura" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <InvoiceDetail invoice={query.data} />
}

/** Factura `draft → issued → cancelled`. Solo el borrador se edita; emitida, solo se anula (sin pagos vigentes). */
function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'edit' | 'issue' | 'cancel' | 'delete' | 'pay' | null>(null)
  const status = invoice.status.value
  const draft = status === 'draft'
  const issued = status === 'issued'

  const cancel = useApiMutation((reason: string) => invoicesApi.cancel(invoice.id, reason), {
    // La OT queda sin factura vigente: se puede volver a facturar.
    invalidate: [['invoices'], ['work-orders']],
    successMessage: 'Factura anulada.',
    onSuccess: () => setDialog(null),
  })

  return (
    <>
      <PageHeader
        pretitle={`Factura · ${invoice.condition.label}`}
        title={`${invoice.number ?? `Borrador #${invoice.id}`} · ${invoice.customer.name}`}
        actions={
          <>
            {can('work-orders.show') ? (
              <Link to={`/work-orders/${invoice.work_order_id}`} className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                {invoice.work_order_code ?? 'Orden de trabajo'}
              </Link>
            ) : (
              <Link to="/invoices" className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Facturas
              </Link>
            )}
            <DownloadButton label="PDF" onDownload={() => invoicesApi.pdf(invoice)} />
            {draft && can('invoices.update') && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setDialog('edit')}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar datos
              </button>
            )}
            {draft && can('invoices.issue') && (
              <button type="button" className="btn btn-outline-success" onClick={() => setDialog('issue')}>
                <IconFileCheck size={18} className="me-1" aria-hidden="true" />
                Emitir
              </button>
            )}
            {issued && can('invoices.cancel') && (
              <button type="button" className="btn btn-outline-danger" onClick={() => setDialog('cancel')}>
                <IconBan size={18} className="me-1" aria-hidden="true" />
                Anular
              </button>
            )}
            {draft && can('invoices.destroy') && (
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
            <InvoiceDataCard invoice={invoice} />
            <TotalsCard invoice={invoice} />
            {issued && (
              <div className="card mt-3">
                <div className="card-header">
                  <h3 className="card-title">Cobro</h3>
                  <div className="card-actions">
                    <StatusBadge value={invoice.payment_summary.status} map={INVOICE_PAYMENT_STATUS} />
                  </div>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-6 fw-normal">Pagado</dt>
                    <dd className="col-6 text-end">{formatGuarani(invoice.payment_summary.paid_total)}</dd>
                    {Number(invoice.payment_summary.credited_total) > 0 && (
                      <>
                        <dt className="col-6 fw-normal">Acreditado (notas de crédito)</dt>
                        <dd className="col-6 text-end">{formatGuarani(invoice.payment_summary.credited_total)}</dd>
                      </>
                    )}
                    <dt className="col-6 h3 mb-0">Saldo</dt>
                    <dd className="col-6 text-end h3 mb-0">{formatGuarani(invoice.payment_summary.balance)}</dd>
                  </dl>
                  {invoice.payment_summary.status !== 'paid' && invoice.payment_summary.status !== 'credited' && can('payments.store') && (
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
            <InvoiceItemsTable invoice={invoice} />
            {(invoice.payments?.length ?? 0) > 0 && (
              <div className="mt-3">
                <InvoicePaymentsTable payments={invoice.payments ?? []} />
              </div>
            )}
          </div>
        </div>
      </PageBody>

      {dialog === 'edit' && <EditInvoiceModal invoice={invoice} onClose={() => setDialog(null)} />}
      {dialog === 'issue' && <IssueInvoiceModal invoice={invoice} onClose={() => setDialog(null)} />}
      {dialog === 'pay' && <PaymentFormModal invoice={invoice} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog === 'cancel'}
        title="Anular factura"
        message={
          <>
            ¿Anular la factura <strong>{invoice.number}</strong>? Es definitivo y su número no se reutiliza. Si tiene pagos
            vigentes, primero hay que anularlos. La orden de trabajo se podrá volver a facturar.
          </>
        }
        confirmLabel="Anular factura"
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
          message="¿Eliminar el borrador de la factura? La orden de trabajo se podrá volver a facturar."
          onDelete={() => invoicesApi.remove(invoice.id)}
          invalidate={[['invoices'], ['work-orders']]}
          successMessage="Borrador eliminado."
          onClose={() => setDialog(null)}
          onDeleted={() => navigate(can('work-orders.show') ? `/work-orders/${invoice.work_order_id}` : '/invoices', { replace: true })}
        />
      )}
    </>
  )
}

function InvoiceDataCard({ invoice }: { invoice: Invoice }) {
  const { can } = useAuth()

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Factura</h3>
        <div className="card-actions">
          <StatusBadge value={invoice.status.value} map={INVOICE_STATUS} />
        </div>
      </div>
      <div className="card-body">
        <dl className="row mb-0">
          <dt className="col-5">Número</dt>
          <dd className="col-7">{invoice.number ?? <span className="text-secondary">Se asigna al emitir</span>}</dd>
          {invoice.stamp.stamp_number && (
            <>
              <dt className="col-5">Timbrado</dt>
              <dd className="col-7">
                {invoice.stamp.stamp_number}
                <div className="small text-secondary">Vence el {formatDate(invoice.stamp.valid_until)}</div>
              </dd>
            </>
          )}
          <dt className="col-5">Emisión</dt>
          <dd className="col-7">{formatDate(invoice.issue_date)}</dd>
          <dt className="col-5">Condición</dt>
          <dd className="col-7">{invoice.condition.label}</dd>
          {invoice.condition.value === 'credit' && (
            <>
              <dt className="col-5">Vencimiento</dt>
              <dd className="col-7">{formatDate(invoice.due_date)}</dd>
            </>
          )}
          <dt className="col-5">Cliente</dt>
          <dd className="col-7">
            {can('clients.show') ? <Link to={`/clients/${invoice.client_id}`}>{invoice.customer.name}</Link> : invoice.customer.name}
          </dd>
          <dt className="col-5">RUC / CI</dt>
          <dd className="col-7">{invoice.customer.tax_id ?? <span className="text-warning">Sin informar</span>}</dd>
          <dt className="col-5">Dirección</dt>
          <dd className="col-7">{invoice.customer.address ?? '—'}</dd>
          <dt className="col-5">Orden de trabajo</dt>
          <dd className="col-7">
            {can('work-orders.show') ? (
              <Link to={`/work-orders/${invoice.work_order_id}`}>{invoice.work_order_code ?? `#${invoice.work_order_id}`}</Link>
            ) : (
              (invoice.work_order_code ?? `#${invoice.work_order_id}`)
            )}
          </dd>
          {invoice.status.value === 'cancelled' && (
            <>
              <dt className="col-12 text-red">Anulada el {formatDateTime(invoice.cancelled_at)}</dt>
              <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                {invoice.cancellation_reason}
              </dd>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}

/** Totales por tasa e IVA liquidado (IVA incluido en los precios), calculados por el backend. */
function TotalsCard({ invoice }: { invoice: Invoice }) {
  const totals = invoice.totals
  const rows: [string, string][] = [
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
          {Number(totals.discount) > 0 && (
            <div className="col-12 d-flex justify-content-between text-secondary">
              <span>Descuentos aplicados</span>
              <span>{formatGuarani(totals.discount)}</span>
            </div>
          )}
          <dt className="col-6 h3 mb-0 mt-2">Total</dt>
          <dd className="col-6 text-end h3 mb-0 mt-2">{formatGuarani(totals.total)}</dd>
          <dd className="col-12 small text-secondary mb-0">IVA incluido · total IVA {formatGuarani(totals.iva_total)}</dd>
        </dl>
      </div>
    </div>
  )
}

function InvoiceItemsTable({ invoice }: { invoice: Invoice }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<InvoiceItem | null>(null)
  const editable = invoice.status.value === 'draft' && can('invoices.update')

  const columns: Column<InvoiceItem>[] = [
    { key: 'description', header: 'Descripción', render: (item) => item.description },
    { key: 'quantity', header: 'Cant.', className: 'text-end', render: (item) => formatQuantity(item.quantity) },
    { key: 'price', header: 'Precio unit.', className: 'text-end text-nowrap', render: (item) => formatGuarani(item.unit_price) },
    { key: 'tax', header: 'IVA', className: 'text-nowrap', render: (item) => item.tax_rate.label },
    {
      key: 'discount',
      header: 'Desc.',
      className: 'text-end text-nowrap',
      render: (item) => (Number(item.discount) > 0 ? formatGuarani(item.discount) : '—'),
    },
    { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (item) => formatGuarani(item.total) },
    ...(editable
      ? [
          {
            key: 'actions',
            header: <span className="visually-hidden">Acciones</span>,
            className: 'w-1 text-nowrap',
            render: (item: InvoiceItem) => <IconButton label={`Editar ${item.description}`} icon={IconPencil} onClick={() => setEditing(item)} />,
          },
        ]
      : []),
  ]

  return (
    <>
      <DataTable
        title="Detalle (precios con IVA incluido)"
        columns={columns}
        rows={invoice.items ?? []}
        rowKey={(item) => item.id}
        emptyMessage="La factura no tiene líneas."
      />
      {invoice.status.value === 'draft' && (
        <div className="small text-secondary mt-2">
          Las líneas salen de lo usado en la OT. En el borrador se puede ajustar la descripción, la tasa de IVA y el descuento.
        </div>
      )}
      {editing && <InvoiceItemModal invoice={invoice} item={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function InvoicePaymentsTable({ payments }: { payments: Payment[] }) {
  const { can } = useAuth()
  const [selected, setSelected] = useState<Payment | null>(null)

  const columns: Column<Payment>[] = [
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (payment) => formatDate(payment.payment_date) },
    {
      key: 'method',
      header: 'Medio',
      render: (payment) => (
        <>
          <div>{payment.method.label}</div>
          <div className="small text-secondary">{[payment.reference, payment.receipt_number].filter(Boolean).join(' · ')}</div>
        </>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      className: 'text-end text-nowrap',
      render: (payment) => (
        <>
          <div>{formatGuarani(payment.amount)}</div>
          {Number(payment.change_amount ?? 0) > 0 && <div className="small text-secondary">vuelto {formatGuarani(payment.change_amount)}</div>}
        </>
      ),
    },
    { key: 'status', header: 'Estado', render: (payment) => <StatusBadge value={payment.status.value} map={PAYMENT_STATUS} /> },
  ]

  return (
    <>
      <DataTable
        title="Pagos"
        columns={columns}
        rows={payments}
        rowKey={(payment) => payment.id}
        onRowClick={can('payments.show') ? setSelected : undefined}
      />
      {selected && <PaymentDetailModal paymentId={selected.id} onClose={() => setSelected(null)} />}
    </>
  )
}
