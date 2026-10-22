import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconBan } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_PAYMENT_STATUS } from '@/features/invoices/api'
import { PAYMENT_STATUS } from '@/features/payments/api'
import { supplierPaymentsApi, type SupplierPayment } from '@/features/supplier-payments/api'
import { formatDate, formatDateTime, formatGuarani } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

/** Detalle de un pago a proveedor (`supplier-payments.show`) con anulación por motivo. */
export function SupplierPaymentDetailModal({ paymentId, onClose }: { paymentId: number; onClose: () => void }) {
  const { can } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  const query = useQuery({ queryKey: ['supplier-payments', 'detail', paymentId], queryFn: () => supplierPaymentsApi.show(paymentId) })
  const payment = query.data

  const cancel = useApiMutation((reason: string) => supplierPaymentsApi.cancel(paymentId, reason), {
    invalidate: [['supplier-payments'], ['purchases']],
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
            ¿Anular el pago <strong>{payment.code}</strong> de {formatGuarani(payment.amount)}? El importe vuelve al saldo de la compra.
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

  return (
    <Modal
      open
      title={payment ? `Pago · ${payment.code}` : 'Pago'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-link link-secondary me-auto" onClick={onClose}>
            Cerrar
          </button>
          {payment?.status.value === 'registered' && can('supplier-payments.cancel') && (
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

function PaymentData({ payment }: { payment: SupplierPayment }) {
  const { can } = useAuth()
  const purchase = payment.purchase

  return (
    <dl className="row mb-0">
      <dt className="col-5">Estado</dt>
      <dd className="col-7">
        <StatusBadge value={payment.status.value} map={PAYMENT_STATUS} />
      </dd>
      <dt className="col-5">Proveedor</dt>
      <dd className="col-7">{payment.supplier?.name ?? '—'}</dd>
      <dt className="col-5">Fecha</dt>
      <dd className="col-7">{formatDate(payment.payment_date)}</dd>
      <dt className="col-5">Monto</dt>
      <dd className="col-7">{formatGuarani(payment.amount)}</dd>
      <dt className="col-5">Medio</dt>
      <dd className="col-7">{payment.method.label}</dd>
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
      {payment.supplier_receipt_number && (
        <>
          <dt className="col-5">Recibo del proveedor</dt>
          <dd className="col-7">{payment.supplier_receipt_number}</dd>
        </>
      )}
      {purchase && (
        <>
          <dt className="col-5">Compra</dt>
          <dd className="col-7">
            {can('purchases.show') ? <Link to={`/purchases/${purchase.id}`}>{purchase.code}</Link> : purchase.code}
            {purchase.supplier_document_number && <div className="small text-secondary">Factura {purchase.supplier_document_number}</div>}
          </dd>
          <dt className="col-5">Saldo de la compra</dt>
          <dd className="col-7">
            {formatGuarani(purchase.balance)} de {formatGuarani(purchase.total)}
            {purchase.payment_status && (
              <div>
                <StatusBadge value={purchase.payment_status} map={INVOICE_PAYMENT_STATUS} />
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
