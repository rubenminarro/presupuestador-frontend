import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconFileInvoice } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_PAYMENT_STATUS, INVOICE_STATUS, invoicesApi } from '@/features/invoices/api'
import { workOrderInvoices, type WorkOrder } from '@/features/work-orders/api'
import { formatGuarani } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

/**
 * En la OT completada: sus facturas vigentes (borrador o emitidas; una por responsable si tiene reparto, M9) o el botón
 * para generar la factura de una OT particular. Las facturas solo llegan con `invoices.show`.
 */
export function WorkOrderInvoice({ workOrder }: { workOrder: WorkOrder }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const invoices = workOrderInvoices(workOrder)

  const create = useApiMutation(() => invoicesApi.createFromWorkOrder(workOrder.id), {
    invalidate: [['invoices'], ['work-orders']],
    successMessage: 'Factura generada en borrador.',
    onSuccess: (created) => {
      setConfirming(false)
      navigate(`/invoices/${created.id}`)
    },
  })

  if (invoices.length > 0) {
    return (
      <div className="card mt-3">
        <div className="card-header">
          <h3 className="card-title">{invoices.length > 1 ? 'Facturas' : 'Factura'}</h3>
        </div>
        <div className="list-group list-group-flush">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="list-group-item d-flex align-items-center gap-2">
              <IconFileInvoice size={20} className="text-secondary" aria-hidden="true" />
              <div className="flex-fill">
                <Link to={`/invoices/${invoice.id}`}>{invoice.number ?? 'En borrador'}</Link>
                {invoice.customer_name && <div className="small">{invoice.customer_name}</div>}
                <div className="small text-secondary">
                  {formatGuarani(invoice.total)} (IVA incluido)
                  {invoice.balance !== undefined && invoice.status.value === 'issued' && ` · saldo ${formatGuarani(invoice.balance)}`}
                </div>
              </div>
              <div className="d-flex flex-column align-items-end gap-1">
                <StatusBadge value={invoice.status.value} map={INVOICE_STATUS} />
                {invoice.payment_status && <StatusBadge value={invoice.payment_status} map={INVOICE_PAYMENT_STATUS} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (workOrder.status.value !== 'completed' || !can('invoices.show')) return null

  // Con líneas de la aseguradora la OT se factura por responsable desde su reparto (M8–M9), no entera al dueño.
  if (workOrder.requires_allocation) {
    return (
      <div className="card mt-3">
        <div className="card-body text-secondary small">
          Esta OT tiene líneas a cargo de la aseguradora: se factura por responsable desde su reparto confirmado.
        </div>
      </div>
    )
  }

  if (!can('invoices.store')) return null

  return (
    <>
      <div className="card mt-3">
        <div className="card-body">
          <p className="text-secondary mb-2">OT completada: genere la factura con lo realmente usado.</p>
          <button type="button" className="btn btn-primary w-100" onClick={() => setConfirming(true)}>
            <IconFileInvoice size={18} className="me-1" aria-hidden="true" />
            Facturar
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Facturar OT"
        message={
          <>
            ¿Generar la factura de <strong>{workOrder.code}</strong>? Se crea en borrador, al contado y con IVA 10%, con los datos
            del cliente; antes de emitirla se pueden ajustar.
          </>
        }
        confirmLabel="Generar borrador"
        isLoading={create.isPending}
        onConfirm={() => create.mutate()}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}
