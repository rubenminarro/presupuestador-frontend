import { useState } from 'react'
import { IconArrowBackUp, IconBan, IconCheck, IconLock, IconPencil, IconPlus, IconTool, IconX } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { SearchPicker } from '@/components/ui/SearchPicker'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { allowsFractions, partsApi, type Part } from '@/features/parts/api'
import {
  CLIENT_DECISION_CHANNELS,
  WORK_ORDER_PART_STATUS,
  workOrdersApi,
  type ClientDecisionChannel,
  type WorkOrder,
  type WorkOrderPart,
} from '@/features/work-orders/api'
import { formatDateTime, formatMoney, formatQuantity } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { toast } from '@/lib/toast'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; line: WorkOrderPart }
  | { kind: 'consume'; line: WorkOrderPart }
  | { kind: 'return'; line: WorkOrderPart }
  | { kind: 'cancel'; line: WorkOrderPart }
  | { kind: 'approve' | 'reject'; line: WorkOrderPart }

const INVALIDATE = [['work-orders'], ['inventory'], ['parts']]

/** Estados sin resolver (la OT no se completa con ellos). */
const OPEN_STATUSES = ['awaiting_approval', 'pending', 'reserved']

/**
 * Repuestos de la OT: `pending → reserved → consumed → returned`, abiertos → `cancelled`. Los extras (fuera del
 * presupuesto) nacen `awaiting_approval` y esperan la respuesta del cliente: aprobados pasan a `pending` (y se
 * intenta reservar), rechazados quedan `cancelled`. Agregar, editar, responder, reservar y cancelar con la OT abierta;
 * consumir y devolver solo en reparación. Precios sin IVA.
 */
export function WorkOrderPartsCard({ workOrder }: { workOrder: WorkOrder }) {
  const { can } = useAuth()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const status = workOrder.status.value
  const editable = status === 'pending' || status === 'in_progress' || status === 'paused'
  const inProgress = status === 'in_progress'
  const showCost = can('work-orders.view-economics')
  const awaitingCount = (workOrder.parts ?? []).filter((line) => line.status.value === 'awaiting_approval').length

  const reserve = useApiMutation((line: WorkOrderPart) => workOrdersApi.reservePart(workOrder.id, line.id), {
    invalidate: INVALIDATE,
    successMessage: 'Stock reservado.',
  })
  const cancel = useApiMutation((line: WorkOrderPart) => workOrdersApi.cancelPart(workOrder.id, line.id), {
    invalidate: INVALIDATE,
    successMessage: 'Repuesto cancelado.',
    onSuccess: () => setDialog(null),
  })

  const columns: Column<WorkOrderPart>[] = [
    {
      key: 'part',
      header: 'Repuesto',
      render: (line) => (
        <>
          <div>{line.part?.name ?? `#${line.part_id}`}</div>
          <div className="small text-secondary">
            {[line.part?.code, line.is_budgeted ? null : 'Extra, fuera del presupuesto', line.notes].filter(Boolean).join(' · ')}
          </div>
          {line.client_decision && (
            <div className={`small ${line.client_decision.value === 'approved' ? 'text-success' : 'text-danger'}`}>
              {[
                line.client_decision.label,
                line.client_decision.channel.label,
                line.client_decision.contact,
                formatDateTime(line.client_decision.decided_at),
              ]
                .filter(Boolean)
                .join(' · ')}
              {line.client_decision.notes && <div className="text-secondary">{line.client_decision.notes}</div>}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      className: 'text-end text-nowrap',
      render: (line) => (
        <>
          <div>{formatQuantity(line.quantity)}</div>
          {line.quantity_consumed !== null && (
            <div className="small text-secondary">
              usado {formatQuantity(line.quantity_consumed)}
              {Number(line.quantity_returned ?? 0) > 0 && ` · dev. ${formatQuantity(line.quantity_returned)}`}
            </div>
          )}
        </>
      ),
    },
    { key: 'price', header: 'Precio unit.', className: 'text-end text-nowrap', render: (line) => formatMoney(line.unit_price) },
    { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (line) => formatMoney(line.total_price) },
    ...(showCost
      ? [{ key: 'cost', header: 'Costo', className: 'text-end text-nowrap', render: (line: WorkOrderPart) => formatMoney(line.total_cost) }]
      : []),
    { key: 'status', header: 'Estado', render: (line) => <StatusBadge value={line.status.value} map={WORK_ORDER_PART_STATUS} /> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (line) => {
        const awaiting = line.status.value === 'awaiting_approval'
        const open = OPEN_STATUSES.includes(line.status.value)
        const name = line.part?.name ?? 'repuesto'
        return (
          <>
            {editable && awaiting && can('work-order-parts.approve') && (
              <>
                <IconButton label={`Registrar aprobación del cliente: ${name}`} icon={IconCheck} variant="success" onClick={() => setDialog({ kind: 'approve', line })} />
                <IconButton label={`Registrar rechazo del cliente: ${name}`} icon={IconX} variant="danger" onClick={() => setDialog({ kind: 'reject', line })} />
              </>
            )}
            {editable && line.status.value === 'pending' && can('work-order-parts.reserve') && (
              <IconButton label={`Reservar ${name}`} icon={IconLock} disabled={reserve.isPending} onClick={() => reserve.mutate(line)} />
            )}
            {inProgress && open && !awaiting && can('work-order-parts.consume') && (
              <IconButton label={`Consumir ${name}`} icon={IconTool} variant="success" onClick={() => setDialog({ kind: 'consume', line })} />
            )}
            {inProgress && line.status.value === 'consumed' && can('work-order-parts.return') && (
              <IconButton label={`Devolver ${name} al stock`} icon={IconArrowBackUp} onClick={() => setDialog({ kind: 'return', line })} />
            )}
            {editable && open && can('work-order-parts.update') && (
              <IconButton label={`Editar ${name}`} icon={IconPencil} onClick={() => setDialog({ kind: 'edit', line })} />
            )}
            {editable && open && can('work-order-parts.cancel') && (
              <IconButton label={`Cancelar ${name}`} icon={IconBan} variant="danger" onClick={() => setDialog({ kind: 'cancel', line })} />
            )}
          </>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        title="Repuestos (precios sin IVA)"
        columns={columns}
        rows={workOrder.parts ?? []}
        rowKey={(line) => line.id}
        emptyMessage="La OT no usa repuestos."
        toolbar={
          editable &&
          can('work-order-parts.store') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({ kind: 'add' })}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Agregar repuesto
            </button>
          )
        }
      />
      {workOrder.parts_summary && workOrder.parts_summary.unresolved_count > 0 && (
        <div className="small text-secondary mt-2">
          {workOrder.parts_summary.unresolved_count} repuesto(s) sin consumir ni cancelar: hay que resolverlos antes de completar la OT.
          {awaitingCount > 0 && ` ${awaitingCount} extra(s) esperan la respuesta del cliente.`}
        </div>
      )}

      {dialog?.kind === 'add' && <PartLineModal workOrder={workOrder} line={null} onClose={() => setDialog(null)} />}
      {(dialog?.kind === 'approve' || dialog?.kind === 'reject') && (
        <DecisionModal workOrder={workOrder} line={dialog.line} decision={dialog.kind} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'edit' && <PartLineModal workOrder={workOrder} line={dialog.line} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'consume' && <ConsumeModal workOrder={workOrder} line={dialog.line} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'return' && <ReturnModal workOrder={workOrder} line={dialog.line} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog?.kind === 'cancel'}
        title="Cancelar repuesto"
        message={
          <>
            ¿Cancelar <strong>{dialog?.kind === 'cancel' ? dialog.line.part?.name : ''}</strong>? Si estaba reservado, se libera el stock.
          </>
        }
        confirmLabel="Cancelar repuesto"
        variant="danger"
        isLoading={cancel.isPending}
        onConfirm={() => dialog?.kind === 'cancel' && cancel.mutate(dialog.line)}
        onClose={() => setDialog(null)}
      />
    </>
  )
}

function quantityStep(unit: string | undefined): string {
  return allowsFractions(unit) ? '0.001' : '1'
}

function PartLineModal({ workOrder, line, onClose }: { workOrder: WorkOrder; line: WorkOrderPart | null; onClose: () => void }) {
  const [part, setPart] = useState<Part | null>(null)
  const [quantity, setQuantity] = useState(line ? toInput(line.quantity) : '1')
  const [unitPrice, setUnitPrice] = useState(line ? toInput(line.unit_price) : '')
  const [notes, setNotes] = useState(line?.notes ?? '')
  const unit = line?.part?.unit.value ?? part?.unit.value
  // Lo que aprobó el cliente (cantidad y precio) no cambia: solo se editan las notas.
  const approved = line?.client_decision?.value === 'approved'

  const mutation = useApiMutation(
    async () => {
      if (line && approved) return workOrdersApi.updatePart(workOrder.id, line.id, { notes: nullIfEmpty(notes) })
      const body = { quantity: toNumber(quantity), notes: nullIfEmpty(notes) }
      if (line) return workOrdersApi.updatePart(workOrder.id, line.id, { ...body, unit_price: toNumber(unitPrice) })
      // Con siniestro abierto el backend avisa que el extra queda a cargo del dueño (P5).
      const { data, meta } = await workOrdersApi.addPart(workOrder.id, { ...body, part_id: part?.id ?? null, unit_price: toNumber(unitPrice) })
      meta?.warnings?.forEach((warning) => toast.warning(warning))
      return data
    },
    {
      invalidate: INVALIDATE,
      successMessage: line ? 'Repuesto actualizado.' : 'Repuesto agregado: queda pendiente de la aprobación del cliente.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={line ? `Editar · ${line.part?.name ?? 'repuesto'}` : 'Agregar repuesto'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      {!line && (
        <p className="text-secondary">
          Es un extra, fuera del presupuesto aprobado: no reserva stock ni se consume hasta registrar la respuesta del cliente.
        </p>
      )}
      {approved && (
        <p className="text-secondary">
          El cliente aprobó esta cantidad y este precio: solo pueden cambiarse las notas. Para otro número, cancelá el repuesto y agregá uno nuevo.
        </p>
      )}
      {!line && (
        <SearchPicker<Part>
          label="Repuesto"
          required
          queryKey={['parts', 'picker']}
          search={async (text) => (await partsApi.list({ search: text, status: 'active', per_page: 8 })).items}
          value={part}
          onChange={setPart}
          getKey={(option) => option.id}
          renderItem={(option) => (
            <>
              <span className="text-secondary me-1">{option.code}</span>
              {option.name}
              <span className="text-secondary ms-2 small">
                {formatMoney(option.sale_price)} · {option.unit.label}
              </span>
            </>
          )}
          placeholder="Código, SKU, nombre o marca…"
          emptyMessage="No hay repuestos activos con ese texto."
          error={errors.part_id}
        />
      )}
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Cantidad"
            name="quantity"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step={quantityStep(unit)}
            disabled={approved}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            errors={errors}
            hint={line?.status.value === 'reserved' && !approved ? 'Cambiar la cantidad ajusta la reserva.' : undefined}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Precio unitario (sin IVA)"
            name="unit_price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            disabled={approved}
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            errors={errors}
            hint={line ? undefined : 'Vacío: precio de venta del repuesto.'}
          />
        </div>
      </div>
      <TextareaField label="Notas" name="notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}

function ConsumeModal({ workOrder, line, onClose }: { workOrder: WorkOrder; line: WorkOrderPart; onClose: () => void }) {
  const [quantity, setQuantity] = useState(toInput(line.quantity))
  const [notes, setNotes] = useState('')
  const mutation = useApiMutation(() => workOrdersApi.consumePart(workOrder.id, line.id, toNumber(quantity), nullIfEmpty(notes)), {
    invalidate: INVALIDATE,
    successMessage: 'Consumo registrado.',
    onSuccess: onClose,
  })
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Consumir · ${line.part?.name ?? 'repuesto'}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Registrar consumo">
      <p className="text-secondary">
        {line.is_budgeted
          ? `Un solo consumo por línea: descuenta del stock lo usado, que puede diferir de lo ${line.status.value === 'reserved' ? 'reservado' : 'previsto'} (${formatQuantity(line.quantity)}).`
          : `Un solo consumo por línea: descuenta del stock lo usado, sin superar lo que aprobó el cliente (${formatQuantity(line.quantity)}).`}
      </p>
      <TextField
        label="Cantidad usada"
        name="quantity_used"
        required
        type="number"
        inputMode="decimal"
        min={0}
        max={line.is_budgeted ? undefined : line.quantity}
        step={quantityStep(line.part?.unit.value)}
        autoFocus
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        errors={errors}
      />
      <TextareaField label="Notas" name="notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}

/** Respuesta del cliente a un extra; al rechazar, el motivo es obligatorio. */
function DecisionModal({
  workOrder,
  line,
  decision,
  onClose,
}: {
  workOrder: WorkOrder
  line: WorkOrderPart
  decision: 'approve' | 'reject'
  onClose: () => void
}) {
  const [channel, setChannel] = useState<ClientDecisionChannel | ''>('')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')
  const approving = decision === 'approve'
  const mutation = useApiMutation(
    () => workOrdersApi.decidePart(workOrder.id, line.id, decision, { channel, contact: nullIfEmpty(contact), notes: nullIfEmpty(notes) }),
    {
      invalidate: INVALIDATE,
      successMessage: approving ? 'Aprobación del cliente registrada.' : 'Rechazo del cliente registrado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={`${approving ? 'Aprobación' : 'Rechazo'} del cliente · ${line.part?.name ?? 'repuesto'}`}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      submitLabel={approving ? 'Registrar aprobación' : 'Registrar rechazo'}
    >
      <p className="text-secondary">
        {formatQuantity(line.quantity)} {line.part?.unit.label.toLowerCase()} a {formatMoney(line.unit_price)} c/u (sin IVA).{' '}
        {approving
          ? 'Aprobado, no podrán cambiarse la cantidad ni el precio, y se intenta reservar el stock.'
          : 'Rechazado, el repuesto queda cancelado.'}
      </p>
      <SelectField label="Medio de la respuesta" name="channel" required value={channel} onChange={(event) => setChannel(event.target.value as ClientDecisionChannel | '')} errors={errors}>
        <option value="">Seleccionar…</option>
        {Object.entries(CLIENT_DECISION_CHANNELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Contacto"
        name="contact"
        maxLength={150}
        value={contact}
        onChange={(event) => setContact(event.target.value)}
        errors={errors}
        hint="Quién respondió o por dónde (opcional)."
      />
      <TextareaField
        label={approving ? 'Notas' : 'Motivo del rechazo'}
        name="notes"
        required={!approving}
        rows={2}
        maxLength={500}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        errors={errors}
      />
    </FormModal>
  )
}

function ReturnModal({ workOrder, line, onClose }: { workOrder: WorkOrder; line: WorkOrderPart; onClose: () => void }) {
  const [quantity, setQuantity] = useState(toInput(line.quantity_net))
  const [reason, setReason] = useState('')
  const mutation = useApiMutation(() => workOrdersApi.returnPart(workOrder.id, line.id, toNumber(quantity), reason.trim()), {
    invalidate: INVALIDATE,
    successMessage: 'Devolución registrada.',
    onSuccess: onClose,
  })
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Devolver al stock · ${line.part?.name ?? 'repuesto'}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Registrar devolución">
      <p className="text-secondary">Usado neto: {formatQuantity(line.quantity_net)}. Lo devuelto vuelve al stock.</p>
      <TextField
        label="Cantidad a devolver"
        name="quantity"
        required
        type="number"
        inputMode="decimal"
        min={0}
        step={quantityStep(line.part?.unit.value)}
        autoFocus
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        errors={errors}
      />
      <TextareaField label="Motivo" name="reason" required rows={2} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} errors={errors} />
    </FormModal>
  )
}
