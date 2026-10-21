import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { inventoryApi, MOVEMENT_TYPE } from '@/features/inventory/api'
import { formatDateTime, formatMoney, formatQuantity } from '@/lib/format'

/** Detalle de un movimiento (inmutable: sin acciones). */
export function MovementDetailModal({ movementId, onClose }: { movementId: number; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['inventory', 'movement', movementId],
    queryFn: () => inventoryApi.movement(movementId),
  })
  const movement = query.data

  return (
    <Modal open title="Movimiento de inventario" onClose={onClose}>
      {!movement ? (
        query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <LoadingState />
        )
      ) : (
        <dl className="row mb-0">
          <dt className="col-5">Tipo</dt>
          <dd className="col-7">
            <StatusBadge value={movement.type.value} map={MOVEMENT_TYPE} />
          </dd>
          <dt className="col-5">Fecha</dt>
          <dd className="col-7">{formatDateTime(movement.created_at)}</dd>
          <dt className="col-5">Repuesto</dt>
          <dd className="col-7">
            {movement.part ? (
              <>
                <span className="text-secondary me-1">{movement.part.code}</span>
                {movement.part.name}
              </>
            ) : (
              '—'
            )}
          </dd>
          <dt className="col-5">Cantidad</dt>
          <dd className="col-7">{formatQuantity(movement.quantity)}</dd>
          <dt className="col-5">Costo unitario (sin IVA)</dt>
          <dd className="col-7">{formatMoney(movement.unit_cost)}</dd>
          <dt className="col-5">Costo total (sin IVA)</dt>
          <dd className="col-7">{formatMoney(movement.total_cost)}</dd>
          <dt className="col-5">Saldo resultante</dt>
          <dd className="col-7">{formatQuantity(movement.balance_after)}</dd>
          <dt className="col-5">Costo promedio resultante</dt>
          <dd className="col-7">{formatMoney(movement.average_cost_after)}</dd>
          <dt className="col-5">Depósito</dt>
          <dd className="col-7">{movement.warehouse ? `${movement.warehouse.code} · ${movement.warehouse.name}` : '—'}</dd>
          <dt className="col-5">Proveedor</dt>
          <dd className="col-7">{movement.supplier?.name ?? '—'}</dd>
          <dt className="col-5">Documento</dt>
          <dd className="col-7">{movement.document_number ?? '—'}</dd>
          <dt className="col-5">Usuario</dt>
          <dd className="col-7">{movement.created_by?.name ?? '—'}</dd>
          {movement.reason && (
            <>
              <dt className="col-12">Motivo</dt>
              <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                {movement.reason}
              </dd>
            </>
          )}
        </dl>
      )}
    </Modal>
  )
}
