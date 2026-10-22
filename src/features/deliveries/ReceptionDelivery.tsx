import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconTruckDelivery } from '@tabler/icons-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { DELIVERY_STATUS, deliveriesApi } from '@/features/deliveries/api'
import { DeliveryFormModal } from '@/features/deliveries/DeliveryFormModal'
import type { Reception } from '@/features/receptions/api'
import { formatDateTime } from '@/lib/format'

/**
 * En la ficha de la recepción: la entrega vigente (o la última anulada) y, con la recepción terminada, el botón para
 * registrarla.
 */
export function ReceptionDelivery({ reception }: { reception: Reception }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const params = { reception_id: reception.id, per_page: 10 }

  const query = useQuery({
    queryKey: ['vehicle-deliveries', params],
    queryFn: () => deliveriesApi.list(params),
    enabled: can('vehicle-deliveries.index'),
  })
  const deliveries = query.data?.items ?? []
  // El listado viene del más nuevo al más viejo: la vigente si la hay, si no la última anulada.
  const delivery = deliveries.find((item) => item.status.value === 'delivered') ?? deliveries[0]
  const canDeliver = reception.status.value === 'completed' && can('vehicle-deliveries.store') && !query.isLoading

  if (!delivery && !canDeliver) return null

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Entrega del vehículo</h3>
          {delivery && (
            <div className="card-actions">
              <StatusBadge value={delivery.status.value} map={DELIVERY_STATUS} />
            </div>
          )}
        </div>
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          {delivery && (
            <div className="flex-fill">
              {can('vehicle-deliveries.show') ? <Link to={`/vehicle-deliveries/${delivery.id}`}>{delivery.delivery_number}</Link> : delivery.delivery_number}
              <span className="text-secondary">
                {' · '}
                {formatDateTime(delivery.delivered_at)} · retiró {delivery.received_by_name} ·{' '}
                {new Intl.NumberFormat('es-PY').format(delivery.final_mileage)} km
              </span>
            </div>
          )}
          {canDeliver && (
            <>
              {!delivery && <p className="text-secondary mb-0 flex-fill">Trabajos terminados: registre la entrega cuando el cliente retire el vehículo.</p>}
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                <IconTruckDelivery size={18} className="me-1" aria-hidden="true" />
                Registrar entrega
              </button>
            </>
          )}
        </div>
      </div>
      {creating && (
        <DeliveryFormModal
          reception={reception}
          onClose={() => setCreating(false)}
          onCreated={(created) => (can('vehicle-deliveries.show') ? navigate(`/vehicle-deliveries/${created.id}`) : undefined)}
        />
      )}
    </>
  )
}
