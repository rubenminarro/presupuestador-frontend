import { useState } from 'react'
import { IconCheck, IconClock, IconPlayerPlay, IconUsers, IconX } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { useActiveMechanics } from '@/features/mechanics/api'
import { WORK_ORDER_ITEM_STATUS, workOrdersApi, type ItemAction, type ItemMechanic, type WorkOrder, type WorkOrderItem } from '@/features/work-orders/api'
import { formatDecimal } from '@/lib/format'
import { toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

const ITEM_ACTIONS: { action: ItemAction; from: WorkOrderItem['status']['value']; label: string; icon: typeof IconCheck; variant: 'primary' | 'success' | 'danger' }[] = [
  { action: 'start', from: 'pending', label: 'Iniciar', icon: IconPlayerPlay, variant: 'primary' },
  { action: 'complete', from: 'in_progress', label: 'Completar', icon: IconCheck, variant: 'success' },
  { action: 'cancel', from: 'pending', label: 'Cancelar', icon: IconX, variant: 'danger' },
]

/** Trabajos de la OT: acciones por ítem (OT en reparación), reparto entre mecánicos y horas. */
export function WorkOrderItemsCard({ workOrder }: { workOrder: WorkOrder }) {
  const { can, user } = useAuth()
  const [cancelling, setCancelling] = useState<WorkOrderItem | null>(null)
  const [assigning, setAssigning] = useState<WorkOrderItem | null>(null)
  const [logging, setLogging] = useState<{ item: WorkOrderItem; assignment: ItemMechanic } | null>(null)
  const status = workOrder.status.value
  const inProgress = status === 'in_progress'
  const closed = status === 'completed' || status === 'cancelled'
  const hoursOpen = status === 'in_progress' || status === 'paused'

  const itemAction = useApiMutation(
    ({ item, action }: { item: WorkOrderItem; action: ItemAction }) => workOrdersApi.itemAction(workOrder.id, item.id, action),
    { invalidate: [['work-orders'], ['receptions']], successMessage: 'Trabajo actualizado.', onSuccess: () => setCancelling(null) },
  )

  // El mecánico solo carga sus propias horas; con `log-hours-any` (jefe de taller, administrador) las de todos.
  const canLogHours = (assignment: ItemMechanic) =>
    hoursOpen &&
    (can('work-order-item-mechanics.log-hours-any') ||
      (can('work-order-item-mechanics.log-hours') && assignment.mechanic?.user_id === user?.id))

  const columns: Column<WorkOrderItem>[] = [
    {
      key: 'description',
      header: 'Trabajo',
      render: (item) => (
        <>
          <div>{item.description}</div>
          <div className="small text-secondary">
            {[item.type.label, `cant. ${formatDecimal(item.quantity)}`, item.estimated_hours ? `${formatDecimal(item.estimated_hours)} h est.` : null]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </>
      ),
    },
    {
      key: 'mechanics',
      header: 'Mecánicos y horas',
      render: (item) =>
        item.mechanics && item.mechanics.length > 0 ? (
          <ul className="list-unstyled mb-0 small">
            {item.mechanics.map((assignment) => (
              <li key={assignment.id} className="d-flex align-items-center gap-1">
                <span>
                  {assignment.mechanic?.full_name ?? `#${assignment.mechanic_id}`}
                  <span className="text-secondary"> · {formatDecimal(assignment.share_percentage)} %</span>
                  <span className="text-secondary"> · {assignment.hours === null ? 'sin horas' : `${formatDecimal(assignment.hours)} h`}</span>
                </span>
                {canLogHours(assignment) && (
                  <IconButton
                    label={`Cargar horas de ${assignment.mechanic?.full_name ?? 'mecánico'}`}
                    icon={IconClock}
                    onClick={() => setLogging({ item, assignment })}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-secondary small">{item.type.value === 'part' ? 'Repuesto (ver abajo)' : '—'}</span>
        ),
    },
    { key: 'status', header: 'Estado', render: (item) => <StatusBadge value={item.status.value} map={WORK_ORDER_ITEM_STATUS} /> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (item) => (
        <>
          {inProgress &&
            ITEM_ACTIONS.filter((entry) => entry.from === item.status.value && can(`work-order-items.${entry.action}`)).map((entry) => (
              <IconButton
                key={entry.action}
                label={`${entry.label} ${item.description}`}
                icon={entry.icon}
                variant={entry.variant}
                disabled={itemAction.isPending}
                onClick={() => (entry.action === 'cancel' ? setCancelling(item) : itemAction.mutate({ item, action: entry.action }))}
              />
            ))}
          {!closed && item.type.value !== 'part' && item.status.value !== 'cancelled' && can('work-order-item-mechanics.sync') && (
            <IconButton label={`Repartir ${item.description} entre mecánicos`} icon={IconUsers} onClick={() => setAssigning(item)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <DataTable title="Trabajos" columns={columns} rows={workOrder.items ?? []} rowKey={(item) => item.id} emptyMessage="La OT no tiene trabajos." />
      {status === 'pending' && <div className="small text-secondary mt-2">Inicie la OT para avanzar los trabajos.</div>}
      {status === 'paused' && <div className="small text-secondary mt-2">OT pausada: reanúdela para avanzar los trabajos.</div>}

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancelar trabajo"
        message={
          <>
            ¿Cancelar <strong>{cancelling?.description}</strong>? También se cancelan sus repuestos abiertos (se libera la reserva).
          </>
        }
        confirmLabel="Cancelar trabajo"
        variant="danger"
        isLoading={itemAction.isPending}
        onConfirm={() => cancelling && itemAction.mutate({ item: cancelling, action: 'cancel' })}
        onClose={() => setCancelling(null)}
      />
      {assigning && <AssignMechanicsModal workOrder={workOrder} item={assigning} onClose={() => setAssigning(null)} />}
      {logging && (
        <LogHoursModal workOrder={workOrder} item={logging.item} assignment={logging.assignment} onClose={() => setLogging(null)} />
      )}
    </>
  )
}

interface Share {
  mechanicId: string
  share: string
}

function AssignMechanicsModal({ workOrder, item, onClose }: { workOrder: WorkOrder; item: WorkOrderItem; onClose: () => void }) {
  const mechanics = useActiveMechanics()
  const [shares, setShares] = useState<Share[]>(
    item.mechanics?.length
      ? item.mechanics.map((assignment) => ({ mechanicId: String(assignment.mechanic_id), share: toInput(assignment.share_percentage) }))
      : [{ mechanicId: String(workOrder.mechanic_id), share: '' }],
  )

  const mutation = useApiMutation(
    () =>
      workOrdersApi.syncMechanics(
        workOrder.id,
        item.id,
        shares.map((row) => ({ mechanic_id: Number(row.mechanicId), share_percentage: toNumber(row.share) })),
      ),
    { invalidate: [['work-orders']], successMessage: 'Reparto actualizado.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)
  const messages = [...new Set(Object.values(errors).flat())]
  const update = (index: number, field: keyof Share, value: string) =>
    setShares((current) => current.map((row, position) => (position === index ? { ...row, [field]: value } : row)))

  return (
    <FormModal title={`Mecánicos · ${item.description}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} size="lg">
      <p className="text-secondary">
        Sin porcentajes el trabajo se reparte en partes iguales; con porcentajes hay que completarlos todos y deben sumar
        100. La comisión de cada uno se calcula sobre el total del ítem (sin IVA).
      </p>
      {shares.map((row, index) => (
        <div key={index} className="row g-2 align-items-end mb-2">
          <div className="col">
            <label className="form-label" htmlFor={`mechanic-${index}`}>
              Mecánico
            </label>
            <select
              id={`mechanic-${index}`}
              className="form-select"
              value={row.mechanicId}
              onChange={(event) => update(index, 'mechanicId', event.target.value)}
            >
              <option value="">Seleccione…</option>
              {mechanics.data?.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>
                  {mechanic.user?.full_name ?? mechanic.employee_code}
                </option>
              ))}
            </select>
          </div>
          <div className="col-4 col-md-3">
            <label className="form-label" htmlFor={`share-${index}`}>
              Participación %
            </label>
            <input
              id={`share-${index}`}
              type="number"
              inputMode="decimal"
              className="form-control"
              min={0.01}
              max={100}
              step="0.01"
              value={row.share}
              onChange={(event) => update(index, 'share', event.target.value)}
            />
          </div>
          <div className="col-auto">
            <IconButton
              label="Quitar mecánico"
              icon={IconX}
              variant="danger"
              disabled={shares.length === 1}
              onClick={() => setShares((current) => current.filter((_, position) => position !== index))}
            />
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-link px-0" onClick={() => setShares((current) => [...current, { mechanicId: '', share: '' }])}>
        + Agregar mecánico
      </button>
      {messages.map((message) => (
        <div key={message} className="invalid-feedback d-block">
          {message}
        </div>
      ))}
    </FormModal>
  )
}

function LogHoursModal({
  workOrder,
  item,
  assignment,
  onClose,
}: {
  workOrder: WorkOrder
  item: WorkOrderItem
  assignment: ItemMechanic
  onClose: () => void
}) {
  const [hours, setHours] = useState(toInput(assignment.hours))
  const mutation = useApiMutation(() => workOrdersApi.logHours(workOrder.id, item.id, assignment.mechanic_id, toNumber(hours)), {
    invalidate: [['work-orders']],
    successMessage: 'Horas registradas.',
    onSuccess: onClose,
  })

  return (
    <FormModal title="Horas trabajadas" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} size="sm">
      <p className="text-secondary">
        {assignment.mechanic?.full_name} · {item.description}
      </p>
      <TextField
        label="Horas"
        name="hours"
        type="number"
        inputMode="decimal"
        min={0.01}
        max={999.99}
        step="0.01"
        autoFocus
        value={hours}
        onChange={(event) => setHours(event.target.value)}
        errors={validationErrors(mutation.error)}
        hint="Vacío borra las horas cargadas. Sin horas, el costo de mano de obra queda desconocido."
      />
    </FormModal>
  )
}
