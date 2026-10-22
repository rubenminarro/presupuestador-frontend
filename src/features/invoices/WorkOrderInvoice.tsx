import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconFileInvoice } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_STATUS, invoicesApi } from '@/features/invoices/api'
import type { WorkOrder } from '@/features/work-orders/api'
import { formatGuarani } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

/**
 * En la OT completada: su factura vigente (borrador o emitida) o el botón para generarla. `invoice` solo llega con
 * `invoices.show`.
 */
export function WorkOrderInvoice({ workOrder }: { workOrder: WorkOrder }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const invoice = workOrder.invoice

  const create = useApiMutation(() => invoicesApi.createFromWorkOrder(workOrder.id), {
    invalidate: [['invoices'], ['work-orders']],
    successMessage: 'Factura generada en borrador.',
    onSuccess: (created) => {
      setConfirming(false)
      navigate(`/invoices/${created.id}`)
    },
  })

  if (invoice) {
    return (
      <div className="card mt-3">
        <div className="card-body d-flex align-items-center gap-2">
          <IconFileInvoice size={20} className="text-secondary" aria-hidden="true" />
          <div className="flex-fill">
            Factura <Link to={`/invoices/${invoice.id}`}>{invoice.number ?? 'en borrador'}</Link>
            <div className="small text-secondary">{formatGuarani(invoice.total)} (IVA incluido)</div>
          </div>
          <StatusBadge value={invoice.status.value} map={INVOICE_STATUS} />
        </div>
      </div>
    )
  }

  if (workOrder.status.value !== 'completed' || !can('invoices.store') || !can('invoices.show')) return null

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
