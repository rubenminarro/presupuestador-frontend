import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconBan } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DownloadButton } from '@/components/ui/DownloadButton'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_PAYMENT_STATUS } from '@/features/invoices/api'
import { PAYMENT_STATUS, paymentsApi, type Payment } from '@/features/payments/api'
import { formatDate, formatDateTime, formatGuarani } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

/** Detalle de un pago (`payments.show`): recibo si la factura es a crédito y anulación con motivo. */
export function PaymentDetailModal({ paymentId, onClose }: { paymentId: number; onClose: () => void }) {
  const { can } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  const query = useQuery({ queryKey: ['payments', 'detail', paymentId], queryFn: () => paymentsApi.show(paymentId) })
  const payment = query.data

  const cancel = useApiMutation((reason: string) => paymentsApi.cancel(paymentId, reason), {
    invalidate: [['payments'], ['invoices']],
    successMessage: 'Pago anulado.',
    onSuccess: () => setCancelling(false),
  })

  if (cancelling && payment) {
    return (
      <ConfirmDialog
        open
        title="Anular pago"
        message={
          <>
            ¿Anular el pago de <strong>{formatGuarani(payment.amount)}</strong>
            {payment.invoice?.number && ` de la factura ${payment.invoice.number}`}? El importe vuelve al saldo de la factura.
          </>
        }
        confirmLabel="Anular pago"
        variant="danger"
        reason={{ label: 'Motivo de la anulación' }}
        isLoading={cancel.isPending}
        error={cancel.error}
        onConfirm={(reason) => cancel.mutate(reason ?? '')}
        onClose={() => setCancelling(false)}
      />
    )
  }

  const registered = payment?.status.value === 'registered'

  return (
    <Modal
      open
      title={payment?.receipt_number ? `Pago · ${payment.receipt_number}` : 'Pago'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-link link-secondary me-auto" onClick={onClose}>
            Cerrar
          </button>
          {payment?.receipt_number && <DownloadButton label="Recibo" onDownload={() => paymentsApi.receipt(payment)} />}
          {registered && can('payments.cancel') && (
            <button type="button" className="btn btn-outline-danger" onClick={() => setCancelling(true)}>
              <IconBan size={18} className="me-1" aria-hidden="true" />
              Anular
            </button>
          )}
        </>
      }
    >
      {payment ? <PaymentData payment={payment} /> : query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
    </Modal>
  )
}

function PaymentData({ payment }: { payment: Payment }) {
  const { can } = useAuth()
  const invoice = payment.invoice

  return (
    <dl className="row mb-0">
      <dt className="col-5">Estado</dt>
      <dd className="col-7">
        <StatusBadge value={payment.status.value} map={PAYMENT_STATUS} />
      </dd>
      <dt className="col-5">Fecha</dt>
      <dd className="col-7">{formatDate(payment.payment_date)}</dd>
      <dt className="col-5">Monto</dt>
      <dd className="col-7">{formatGuarani(payment.amount)}</dd>
      <dt className="col-5">Medio</dt>
      <dd className="col-7">{payment.method.label}</dd>
      {payment.amount_received && (
        <>
          <dt className="col-5">Entregado</dt>
          <dd className="col-7">
            {formatGuarani(payment.amount_received)}
            <div className="small text-secondary">Vuelto {formatGuarani(payment.change_amount)}</div>
          </dd>
        </>
      )}
      {payment.reference && (
        <>
          <dt className="col-5">Referencia</dt>
          <dd className="col-7">{payment.reference}</dd>
        </>
      )}
      {payment.bank && (
        <>
          <dt className="col-5">Banco</dt>
          <dd className="col-7">{payment.bank}</dd>
        </>
      )}
      {invoice && (
        <>
          <dt className="col-5">Factura</dt>
          <dd className="col-7">
            {can('invoices.show') ? <Link to={`/invoices/${invoice.id}`}>{invoice.number ?? `#${invoice.id}`}</Link> : invoice.number}
            <div className="small text-secondary">{invoice.customer_name}</div>
          </dd>
          <dt className="col-5">Saldo de la factura</dt>
          <dd className="col-7">
            {formatGuarani(invoice.balance)} de {formatGuarani(invoice.total)}
            {invoice.payment_status && (
              <div>
                <StatusBadge value={invoice.payment_status} map={INVOICE_PAYMENT_STATUS} />
              </div>
            )}
          </dd>
        </>
      )}
      {payment.notes && (
        <>
          <dt className="col-12">Notas</dt>
          <dd className="col-12" style={{ whiteSpace: 'pre-line' }}>
            {payment.notes}
          </dd>
        </>
      )}
      {payment.status.value === 'cancelled' && (
        <>
          <dt className="col-12 text-red">Anulado el {formatDateTime(payment.cancelled_at ?? null)}</dt>
          <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
            {payment.cancellation_reason}
          </dd>
        </>
      )}
    </dl>
  )
}
