import { useState } from 'react'
import { IconArrowBackUp, IconBan, IconLock, IconPencil, IconPlus, IconTool } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { SearchPicker } from '@/components/ui/SearchPicker'
import { TextareaField, TextField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { allowsFractions, partsApi, type Part } from '@/features/parts/api'
import { WORK_ORDER_PART_STATUS, workOrdersApi, type WorkOrder, type WorkOrderPart } from '@/features/work-orders/api'
import { formatMoney, formatQuantity } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; line: WorkOrderPart }
  | { kind: 'consume'; line: WorkOrderPart }
  | { kind: 'return'; line: WorkOrderPart }
  | { kind: 'cancel'; line: WorkOrderPart }

const INVALIDATE = [['work-orders'], ['inventory'], ['parts']]

/**
 * Repuestos de la OT: `pending → reserved → consumed → returned`, `pending|reserved → cancelled`. Agregar, editar,
 * reservar y cancelar con la OT abierta; consumir y devolver solo en reparación. Precios sin IVA.
 */
export function WorkOrderPartsCard({ workOrder }: { workOrder: WorkOrder }) {
  const { can } = useAuth()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const status = workOrder.status.value
  const editable = status === 'pending' || status === 'in_progress' || status === 'paused'
  const inProgress = status === 'in_progress'
  const showCost = can('work-orders.view-economics')

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
            {[line.part?.code, line.is_budgeted ? null : 'Agregado en la OT', line.notes].filter(Boolean).join(' · ')}
          </div>
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
        const open = line.status.value === 'pending' || line.status.value === 'reserved'
        const name = line.part?.name ?? 'repuesto'
        return (
          <>
            {editable && line.status.value === 'pending' && can('work-order-parts.reserve') && (
              <IconButton label={`Reservar ${name}`} icon={IconLock} disabled={reserve.isPending} onClick={() => reserve.mutate(line)} />
            )}
            {inProgress && open && can('work-order-parts.consume') && (
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
        </div>
      )}

      {dialog?.kind === 'add' && <PartLineModal workOrder={workOrder} line={null} onClose={() => setDialog(null)} />}
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

  const mutation = useApiMutation(
    () => {
      const body = { quantity: toNumber(quantity), notes: nullIfEmpty(notes) }
      return line
        ? workOrdersApi.updatePart(workOrder.id, line.id, { ...body, unit_price: toNumber(unitPrice) })
        : workOrdersApi.addPart(workOrder.id, { ...body, part_id: part?.id ?? null, unit_price: toNumber(unitPrice) })
    },
    { invalidate: INVALIDATE, successMessage: line ? 'Repuesto actualizado.' : 'Repuesto agregado.', onSuccess: onClose },
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
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            errors={errors}
            hint={line?.status.value === 'reserved' ? 'Cambiar la cantidad ajusta la reserva.' : undefined}
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
        Un solo consumo por línea: descuenta del stock lo usado, que puede diferir de lo {line.status.value === 'reserved' ? 'reservado' : 'previsto'} ({formatQuantity(line.quantity)}).
      </p>
      <TextField
        label="Cantidad usada"
        name="quantity_used"
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
      <TextareaField label="Notas" name="notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
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
