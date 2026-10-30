import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconBan, IconCheck, IconPencil, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormModal } from '@/components/ui/FormModal'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, TextareaField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { WorkOrderAllocation } from '@/features/allocations/WorkOrderAllocation'
import { WorkOrderInvoice } from '@/features/invoices/WorkOrderInvoice'
import { useActiveMechanics } from '@/features/mechanics/api'
import { receptionVehicleLabel } from '@/features/receptions/api'
import { WORK_ORDER_STATUS, workOrdersApi, type EconomicSummary, type WorkOrder, type WorkOrderAction } from '@/features/work-orders/api'
import { WorkOrderItemsCard } from '@/features/work-orders/WorkOrderItemsCard'
import { WorkOrderPartsCard } from '@/features/work-orders/WorkOrderPartsCard'
import { formatDateTime, formatDecimal, formatMoney } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { toast } from '@/lib/toast'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

export function WorkOrderDetailPage() {
  const { id } = useParams()
  const workOrderId = Number(id)

  const query = useQuery({
    queryKey: ['work-orders', 'detail', workOrderId],
    queryFn: () => workOrdersApi.show(workOrderId),
    enabled: Number.isInteger(workOrderId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Órdenes de trabajo" title="Orden de trabajo" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <WorkOrderDetail workOrder={query.data} />
}

const ACTIONS: {
  action: WorkOrderAction
  from: WorkOrder['status']['value']
  label: string
  icon: typeof IconCheck
  variant: 'primary' | 'warning' | 'success' | 'danger'
  confirm: string
  success: string
}[] = [
  { action: 'start', from: 'pending', label: 'Iniciar', icon: IconPlayerPlay, variant: 'primary', confirm: 'La recepción pasa a "En reparación".', success: 'OT iniciada.' },
  { action: 'pause', from: 'in_progress', label: 'Pausar', icon: IconPlayerPause, variant: 'warning', confirm: 'Los trabajos no avanzan mientras está pausada.', success: 'OT pausada.' },
  { action: 'resume', from: 'paused', label: 'Reanudar', icon: IconPlayerPlay, variant: 'primary', confirm: 'Vuelve a "En reparación".', success: 'OT reanudada.' },
  {
    action: 'complete',
    from: 'in_progress',
    label: 'Completar',
    icon: IconCheck,
    variant: 'success',
    confirm: 'Exige trabajos terminados o cancelados y repuestos consumidos o cancelados. Congela el cierre económico y las comisiones; no se puede deshacer.',
    success: 'OT completada.',
  },
  { action: 'cancel', from: 'pending', label: 'Cancelar', icon: IconBan, variant: 'danger', confirm: 'Cancela sus trabajos y libera las reservas de repuestos. Es definitivo.', success: 'OT cancelada.' },
]

function WorkOrderDetail({ workOrder }: { workOrder: WorkOrder }) {
  const { can } = useAuth()
  const [confirming, setConfirming] = useState<(typeof ACTIONS)[number] | null>(null)
  const [editing, setEditing] = useState(false)
  const status = workOrder.status.value
  const reception = workOrder.reception

  const action = useApiMutation((value: WorkOrderAction) => workOrdersApi.action(workOrder.id, value), {
    // El estado de la recepción se deriva de sus OT.
    invalidate: [['work-orders'], ['receptions'], ['inventory'], ['parts']],
    onSuccess: (_data, value) => {
      setConfirming(null)
      toast.success(ACTIONS.find((item) => item.action === value)?.success ?? 'OT actualizada.')
    },
  })

  const available = ACTIONS.filter((item) => item.from === status && can(`work-orders.${item.action}`))

  return (
    <>
      <PageHeader
        pretitle={`Orden de trabajo · ${formatDateTime(workOrder.created_at)}`}
        title={`${workOrder.code}${reception ? ` · ${receptionVehicleLabel(reception.vehicle)}` : ''}`}
        actions={
          <>
            {can('receptions.show') ? (
              <Link to={`/receptions/${workOrder.reception_id}`} className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Recepción #{workOrder.reception_id}
              </Link>
            ) : (
              <Link to="/work-orders" className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Órdenes de trabajo
              </Link>
            )}
            {can('work-orders.update') && status === 'pending' && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setEditing(true)}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar
              </button>
            )}
            {available.map((item) => (
              <button key={item.action} type="button" className={`btn btn-outline-${item.variant}`} onClick={() => setConfirming(item)}>
                <item.icon size={18} className="me-1" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </>
        }
      />
      <PageBody>
        <div className="row row-cards">
          {workOrder.owner_amount_warning && (
            <div className="col-12">
              <div className="alert alert-warning mb-0" role="alert">
                <h4 className="alert-title">Parte del dueño por encima de lo aceptado</h4>
                <div>{workOrder.owner_amount_warning.message}</div>
                {workOrder.owner_amount_warning.amount_exceeded && (
                  <div className="small mt-1">
                    Aceptado {formatMoney(workOrder.owner_amount_warning.accepted_amount)} · hoy{' '}
                    {formatMoney(workOrder.owner_amount_warning.potential_amount)} · diferencia{' '}
                    {formatMoney(workOrder.owner_amount_warning.difference)} (sin IVA).
                  </div>
                )}
                <div className="small text-secondary mt-1">
                  Se resuelve con una re-aceptación del dueño en el presupuesto, una absorción del taller o un presupuesto
                  complementario. No bloquea la OT: el control es al confirmar el reparto.
                </div>
              </div>
            </div>
          )}
          <div className="col-12 col-lg-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Orden de trabajo</h3>
                <div className="card-actions">
                  <StatusBadge value={status} map={WORK_ORDER_STATUS} />
                </div>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  {reception && (
                    <>
                      <dt className="col-5">Cliente</dt>
                      <dd className="col-7">{reception.client.full_name}</dd>
                      <dt className="col-5">Vehículo</dt>
                      <dd className="col-7">
                        {receptionVehicleLabel(reception.vehicle)}
                        <div className="small text-secondary">{[reception.vehicle.brand, reception.vehicle.model].filter(Boolean).join(' ')}</div>
                      </dd>
                    </>
                  )}
                  <dt className="col-5">Presupuesto</dt>
                  <dd className="col-7">
                    {can('budgets.show') ? (
                      <Link to={`/budgets/${workOrder.budget_id}`}>{workOrder.budget?.code ?? `#${workOrder.budget_id}`}</Link>
                    ) : (
                      (workOrder.budget?.code ?? `#${workOrder.budget_id}`)
                    )}
                  </dd>
                  <dt className="col-5">Responsable</dt>
                  <dd className="col-7">{workOrder.mechanic?.user?.full_name ?? '—'}</dd>
                  <dt className="col-5">Inicio</dt>
                  <dd className="col-7">{formatDateTime(workOrder.started_at)}</dd>
                  <dt className="col-5">Fin</dt>
                  <dd className="col-7">{formatDateTime(workOrder.completed_at)}</dd>
                  {workOrder.notes && (
                    <>
                      <dt className="col-12">Notas</dt>
                      <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                        {workOrder.notes}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
            <WorkOrderInvoice workOrder={workOrder} />
            <LaborCard workOrder={workOrder} />
            {workOrder.economic_summary && <EconomicCard summary={workOrder.economic_summary} />}
          </div>
          <div className="col-12 col-lg-8">
            <WorkOrderItemsCard workOrder={workOrder} />
            <div className="mt-3">
              <WorkOrderPartsCard workOrder={workOrder} />
            </div>
          </div>
          {workOrder.requires_allocation && can('work-order-allocations.show') && (
            <div className="col-12">
              <WorkOrderAllocation workOrder={workOrder} />
            </div>
          )}
        </div>
      </PageBody>

      {confirming && (
        <ConfirmDialog
          open
          title={`${confirming.label} OT`}
          message={
            <>
              ¿{confirming.label} la orden <strong>{workOrder.code}</strong>? {confirming.confirm}
            </>
          }
          confirmLabel={confirming.label}
          variant={confirming.variant === 'danger' ? 'danger' : confirming.variant === 'warning' ? 'warning' : 'primary'}
          isLoading={action.isPending}
          onConfirm={() => action.mutate(confirming.action)}
          onClose={() => setConfirming(null)}
        />
      )}
      {editing && <EditWorkOrderModal workOrder={workOrder} onClose={() => setEditing(false)} />}
    </>
  )
}

function LaborCard({ workOrder }: { workOrder: WorkOrder }) {
  const labor = workOrder.labor_summary
  const commissions = workOrder.commission_summary
  const showCosts = Boolean(workOrder.economic_summary)
  if (!labor) return null

  return (
    <div className="card mt-3">
      <div className="card-header">
        <h3 className="card-title">Mano de obra</h3>
      </div>
      <div className="card-body">
        <dl className="row mb-0">
          <dt className="col-7 fw-normal">Horas estimadas</dt>
          <dd className="col-5 text-end">{formatDecimal(labor.estimated_hours)}</dd>
          <dt className="col-7 fw-normal">Horas cargadas</dt>
          <dd className="col-5 text-end">{formatDecimal(labor.actual_hours)}</dd>
          {labor.assignments_without_hours > 0 && (
            <dd className="col-12 small text-secondary">{labor.assignments_without_hours} asignación(es) sin horas cargadas.</dd>
          )}
          {showCosts && (
            <>
              <dt className="col-7 fw-normal">Costo de mano de obra</dt>
              <dd className="col-5 text-end">{labor.labor_cost === null ? 'Desconocido' : formatMoney(labor.labor_cost)}</dd>
            </>
          )}
          {commissions && commissions.by_mechanic.length > 0 && (
            <>
              <dt className="col-12 mt-2">Comisiones {commissions.is_final ? '(congeladas)' : '(provisorias)'}</dt>
              {commissions.by_mechanic.map((row) => (
                <div key={row.mechanic_id} className="col-12 d-flex justify-content-between small">
                  <span>{row.full_name}</span>
                  <span>{formatMoney(row.commission_amount)}</span>
                </div>
              ))}
            </>
          )}
        </dl>
      </div>
    </div>
  )
}

/** Solo con `work-orders.view-economics`. Importes sin IVA. */
function EconomicCard({ summary }: { summary: EconomicSummary }) {
  const rows: [string, string][] = [
    ['Venta mano de obra', summary.sale.labor],
    ['Venta repuestos', summary.sale.parts],
    ['Costo repuestos', summary.cost.parts],
    ['Costo mano de obra', summary.cost.labor],
    ['Comisiones', summary.cost.commissions],
  ]

  return (
    <div className="card mt-3">
      <div className="card-header">
        <h3 className="card-title">Cierre económico (sin IVA)</h3>
        <div className="card-actions">
          <span className={`badge ${summary.is_final ? 'bg-green-lt' : 'bg-yellow-lt'}`}>{summary.is_final ? 'Congelado' : 'Provisorio'}</span>
        </div>
      </div>
      <div className="card-body">
        <dl className="row mb-0">
          <dt className="col-7 fw-normal">Presupuestado</dt>
          <dd className="col-5 text-end">{formatMoney(summary.budgeted.total)}</dd>
          {rows.map(([label, value]) => (
            <div key={label} className="col-12 d-flex justify-content-between">
              <span>{label}</span>
              <span>{formatMoney(value)}</span>
            </div>
          ))}
          <dt className="col-7 mt-2">Venta</dt>
          <dd className="col-5 text-end mt-2">{formatMoney(summary.sale.total)}</dd>
          <dt className="col-7">Costo</dt>
          <dd className="col-5 text-end">{formatMoney(summary.cost.total)}</dd>
          <dt className="col-7 h4 mb-0">Margen</dt>
          <dd className="col-5 text-end h4 mb-0">
            {formatMoney(summary.gross_margin)}
            {summary.margin_percentage !== null && <div className="small text-secondary">{formatDecimal(summary.margin_percentage)} %</div>}
          </dd>
          {!summary.is_cost_complete && (
            <dd className="col-12 small text-warning mt-2 mb-0">Faltan costos (horas o costo de mecánicos): el margen usa solo los conocidos.</dd>
          )}
        </dl>
      </div>
    </div>
  )
}

function EditWorkOrderModal({ workOrder, onClose }: { workOrder: WorkOrder; onClose: () => void }) {
  const { can } = useAuth()
  const canPickMechanic = can('mechanics.index')
  const mechanics = useActiveMechanics(canPickMechanic)
  const [mechanicId, setMechanicId] = useState(toInput(workOrder.mechanic_id))
  const [notes, setNotes] = useState(workOrder.notes ?? '')
  // Se conserva el responsable actual aunque ya no esté activo.
  const options = [...(mechanics.data ?? [])]
  if (workOrder.mechanic && !options.some((mechanic) => mechanic.id === workOrder.mechanic?.id)) options.unshift(workOrder.mechanic)

  const mutation = useApiMutation(
    () =>
      workOrdersApi.update(workOrder.id, {
        notes: nullIfEmpty(notes),
        ...(canPickMechanic && { mechanic_id: toNumber(mechanicId) }),
      }),
    { invalidate: [['work-orders']], successMessage: 'OT actualizada.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Editar ${workOrder.code}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      {canPickMechanic && (
        <SelectField
          label="Mecánico responsable"
          name="mechanic_id"
          required
          value={mechanicId}
          onChange={(event) => setMechanicId(event.target.value)}
          errors={errors}
          hint="Cambiarlo reasigna sus trabajos al 100 % al nuevo responsable."
        >
          {options.map((mechanic) => (
            <option key={mechanic.id} value={mechanic.id}>
              {mechanic.user?.full_name ?? mechanic.employee_code}
            </option>
          ))}
        </SelectField>
      )}
      <TextareaField label="Notas" name="notes" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}
