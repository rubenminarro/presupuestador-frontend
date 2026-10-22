import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconBan } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DownloadButton } from '@/components/ui/DownloadButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { DELIVERY_STATUS, deliveriesApi, type Delivery } from '@/features/deliveries/api'
import { FUEL_LEVELS } from '@/features/receptions/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

export function DeliveryDetailPage() {
  const { id } = useParams()
  const deliveryId = Number(id)

  const query = useQuery({
    queryKey: ['vehicle-deliveries', 'detail', deliveryId],
    queryFn: () => deliveriesApi.show(deliveryId),
    enabled: Number.isInteger(deliveryId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Entregas" title="Entrega" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <DeliveryDetail delivery={query.data} />
}

const kilometers = (value: number | null | undefined) => (value === null || value === undefined ? '—' : `${new Intl.NumberFormat('es-PY').format(value)} km`)

/** Comprobante de entrega: inmutable, solo se anula (administrador) y la recepción vuelve a su estado anterior. */
function DeliveryDetail({ delivery }: { delivery: Delivery }) {
  const { can } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  const reception = delivery.reception

  const cancel = useApiMutation((reason: string) => deliveriesApi.cancel(delivery.id, reason), {
    invalidate: [['vehicle-deliveries'], ['receptions']],
    successMessage: 'Entrega anulada.',
    onSuccess: () => setCancelling(false),
  })

  return (
    <>
      <PageHeader
        pretitle={`Entrega · ${formatDateTime(delivery.delivered_at)}`}
        title={`${delivery.delivery_number} · ${delivery.vehicle?.plate ?? 'Sin chapa'}`}
        actions={
          <>
            {reception && can('receptions.show') ? (
              <Link to={`/receptions/${reception.id}`} className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Recepción #{reception.id}
              </Link>
            ) : (
              <Link to="/vehicle-deliveries" className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Entregas
              </Link>
            )}
            <DownloadButton label="PDF" onDownload={() => deliveriesApi.pdf(delivery)} />
            {delivery.status.value === 'delivered' && can('vehicle-deliveries.cancel') && (
              <button type="button" className="btn btn-outline-danger" onClick={() => setCancelling(true)}>
                <IconBan size={18} className="me-1" aria-hidden="true" />
                Anular
              </button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="row row-cards">
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Entrega</h3>
                <div className="card-actions">
                  <StatusBadge value={delivery.status.value} map={DELIVERY_STATUS} />
                </div>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  {delivery.client && (
                    <>
                      <dt className="col-5">Cliente</dt>
                      <dd className="col-7">
                        {can('clients.show') ? <Link to={`/clients/${delivery.client.id}`}>{delivery.client.full_name}</Link> : delivery.client.full_name}
                        <div className="small text-secondary">{delivery.client.document_number}</div>
                      </dd>
                    </>
                  )}
                  <dt className="col-5">Retiró</dt>
                  <dd className="col-7">
                    {delivery.received_by.name}
                    <div className="small text-secondary">{delivery.received_by.document}</div>
                  </dd>
                  <dt className="col-5">Fecha</dt>
                  <dd className="col-7">{formatDateTime(delivery.delivered_at)}</dd>
                  <dt className="col-5">Kilometraje</dt>
                  <dd className="col-7">
                    {kilometers(delivery.final_mileage)}
                    {reception && <div className="small text-secondary">Al ingresar ({formatDate(reception.reception_date)}): {kilometers(reception.mileage)}</div>}
                  </dd>
                  <dt className="col-5">Combustible</dt>
                  <dd className="col-7">{delivery.fuel_level ? FUEL_LEVELS[delivery.fuel_level] : '—'}</dd>
                  <dt className="col-5">Conformidad</dt>
                  <dd className="col-7">{delivery.customer_accepted ? 'El cliente dio su conformidad' : 'Sin conformidad'}</dd>
                  {delivery.observations && (
                    <>
                      <dt className="col-12">Observaciones</dt>
                      <dd className="col-12" style={{ whiteSpace: 'pre-line' }}>
                        {delivery.observations}
                      </dd>
                    </>
                  )}
                  {delivery.status.value === 'cancelled' && (
                    <>
                      <dt className="col-12 text-red">Anulada el {formatDateTime(delivery.cancelled_at)}</dt>
                      <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                        {delivery.cancellation_reason}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Firma</h3>
              </div>
              <div className="card-body">
                {delivery.signature_url ? (
                  <img src={delivery.signature_url} alt={`Firma de ${delivery.received_by.name}`} className="img-fluid border rounded" />
                ) : (
                  <span className="text-secondary">No se cargó la firma.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageBody>

      <ConfirmDialog
        open={cancelling}
        title="Anular entrega"
        message={
          <>
            ¿Anular la entrega <strong>{delivery.delivery_number}</strong>? La recepción vuelve a su estado anterior y el número no se
            reutiliza. Si el vehículo ya tiene otra recepción abierta, no se puede anular.
          </>
        }
        confirmLabel="Anular entrega"
        variant="danger"
        reason={{ label: 'Motivo de la anulación' }}
        isLoading={cancel.isPending}
        error={cancel.error}
        onConfirm={(reason) => cancel.mutate(reason ?? '')}
        onClose={() => setCancelling(false)}
      />
    </>
  )
}
