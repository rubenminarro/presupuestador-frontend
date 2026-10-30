import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconBan,
  IconCheck,
  IconFileDownload,
  IconPencil,
  IconPlus,
  IconSend,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { TextareaField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import {
  BUDGET_ITEM_TYPES,
  BUDGET_STATUS,
  budgetsApi,
  type Budget,
  type BudgetAction,
  type BudgetDecisionInput,
  type BudgetItem,
} from '@/features/budgets/api'
import { BudgetItemFormModal } from '@/features/budgets/BudgetItemFormModal'
import { ClientAcceptancesCard, ClientDecisionModal } from '@/features/budgets/ClientDecision'
import { isReceptionOpen, receptionVehicleLabel } from '@/features/receptions/api'
import { BudgetWorkOrder } from '@/features/work-orders/BudgetWorkOrder'
import { formatDate, formatDateTime, formatDecimal, formatMoney } from '@/lib/format'
import { nullIfEmpty } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { toast } from '@/lib/toast'
import { validationErrors } from '@/services/api'

export function BudgetDetailPage() {
  const { id } = useParams()
  const budgetId = Number(id)

  const query = useQuery({
    queryKey: ['budgets', 'detail', budgetId],
    queryFn: () => budgetsApi.show(budgetId),
    enabled: Number.isInteger(budgetId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Presupuestos" title="Presupuesto" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <BudgetDetail budget={query.data} />
}

/** Acciones de estado: cuál se ofrece en cada estado y con qué permiso (el backend vuelve a validar la transición). */
const ACTIONS: { action: BudgetAction; from: Budget['status'][]; label: string; icon: typeof IconSend; variant: string; success: string }[] = [
  { action: 'send', from: ['draft'], label: 'Enviar', icon: IconSend, variant: 'primary', success: 'Presupuesto enviado.' },
  { action: 'approve', from: ['sent'], label: 'Aprobar', icon: IconCheck, variant: 'success', success: 'Presupuesto aprobado.' },
  { action: 'reject', from: ['sent'], label: 'Rechazar', icon: IconX, variant: 'danger', success: 'Presupuesto rechazado.' },
  { action: 'reopen', from: ['rejected'], label: 'Reabrir', icon: IconArrowBackUp, variant: 'secondary', success: 'Presupuesto reabierto como borrador.' },
  { action: 'cancel', from: ['draft', 'sent'], label: 'Cancelar', icon: IconBan, variant: 'warning', success: 'Presupuesto cancelado.' },
]

const CONFIRM: Partial<Record<BudgetAction, string>> = {
  send: 'Se avisa al cliente por email (si tiene los avisos activos) y ya no se puede editar. Exige los diagnósticos de la recepción terminados o cancelados.',
  approve: 'El cliente aceptó el presupuesto: queda listo para generar la orden de trabajo.',
  reject: 'El cliente no aceptó el presupuesto. Se puede reabrir como borrador.',
  cancel: 'Es definitivo: el presupuesto deja de usarse.',
}

function BudgetDetail({ budget }: { budget: Budget }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState<(typeof ACTIONS)[number] | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const reception = budget.reception
  // Recepción entregada o cancelada: el presupuesto solo se puede cancelar (RECEPTION_CLOSED).
  const receptionOpen = !reception || isReceptionOpen(reception.status.value)
  const draft = budget.status === 'draft' && receptionOpen

  const action = useApiMutation(
    ({ value, decision }: { value: BudgetAction; decision?: BudgetDecisionInput }) => budgetsApi.action(budget.id, value, decision),
    {
      invalidate: [['budgets'], ['receptions']],
      onSuccess: (_data, { value }) => {
        setConfirming(null)
        toast.success(ACTIONS.find((item) => item.action === value)?.success ?? 'Presupuesto actualizado.')
      },
    },
  )

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      await budgetsApi.pdf(budget)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo descargar el PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const available = ACTIONS.filter(
    (item) => item.from.includes(budget.status) && (receptionOpen || item.action === 'cancel') && can(`budgets.${item.action}`),
  )

  return (
    <>
      <PageHeader
        pretitle={`Presupuesto · ${formatDate(budget.created_at)}`}
        title={`${budget.code}${reception ? ` · ${receptionVehicleLabel(reception.vehicle)}` : ''}`}
        actions={
          <>
            {can('receptions.show') ? (
              <Link to={`/receptions/${budget.reception_id}`} className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Recepción #{budget.reception_id}
              </Link>
            ) : (
              <Link to="/budgets" className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Presupuestos
              </Link>
            )}
            <button type="button" className="btn btn-outline-secondary" disabled={downloading} onClick={() => void downloadPdf()}>
              {downloading ? (
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              ) : (
                <IconFileDownload size={18} className="me-1" aria-hidden="true" />
              )}
              PDF
            </button>
            {available.map((item) => (
              <button key={item.action} type="button" className={`btn btn-outline-${item.variant}`} onClick={() => setConfirming(item)}>
                <item.icon size={18} className="me-1" aria-hidden="true" />
                {item.label}
              </button>
            ))}
            {can('budgets.destroy') && draft && (
              <button type="button" className="btn btn-outline-danger" onClick={() => setDeleting(true)}>
                <IconTrash size={18} className="me-1" aria-hidden="true" />
                Eliminar
              </button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="row row-cards">
          <div className="col-12 col-lg-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Presupuesto</h3>
                <div className="card-actions">
                  <StatusBadge value={budget.status} map={BUDGET_STATUS} />
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
                  <dt className="col-5">Creado por</dt>
                  <dd className="col-7">{budget.creator ? `${budget.creator.first_name} ${budget.creator.last_name}` : '—'}</dd>
                  {budget.approved_at && (
                    <>
                      <dt className="col-5">Aprobado</dt>
                      <dd className="col-7">{formatDateTime(budget.approved_at)}</dd>
                    </>
                  )}
                  <dt className="col-12 d-flex align-items-center">
                    Notas
                    {can('budgets.update') && draft && (
                      <IconButton label="Editar notas" icon={IconPencil} onClick={() => setEditingNotes(true)} />
                    )}
                  </dt>
                  <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                    {budget.notes ?? <span className="text-secondary">Sin notas.</span>}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="card mt-3">
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-6 fw-normal">Subtotal (sin IVA)</dt>
                  <dd className="col-6 text-end">{formatMoney(budget.subtotal)}</dd>
                  <dt className="col-6 fw-normal">IVA</dt>
                  <dd className="col-6 text-end">{formatMoney(budget.tax)}</dd>
                  <dt className="col-6 h3 mb-0">Total</dt>
                  <dd className="col-6 text-end h3 mb-0">{formatMoney(budget.total)}</dd>
                </dl>
              </div>
            </div>
            <BudgetWorkOrder budget={budget} />
          </div>
          <div className="col-12 col-lg-8">
            <BudgetItemsTable budget={budget} editable={draft} />
            {budget.client_acceptances && budget.client_acceptances.length > 0 && (
              <ClientAcceptancesCard acceptances={budget.client_acceptances} />
            )}
            {!receptionOpen && (budget.status === 'draft' || budget.status === 'sent') && (
              <div className="small text-secondary mt-2">La recepción está cerrada: este presupuesto ya no se modifica; solo se puede cancelar.</div>
            )}
          </div>
        </div>
      </PageBody>

      {confirming && (confirming.action === 'approve' || confirming.action === 'reject') && (
        <ClientDecisionModal
          budget={budget}
          decision={confirming.action}
          isSubmitting={action.isPending}
          error={action.error}
          onSubmit={(decision) => action.mutate({ value: confirming.action, decision })}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming && confirming.action !== 'approve' && confirming.action !== 'reject' && (
        <ConfirmDialog
          open
          title={`${confirming.label} presupuesto`}
          message={
            <>
              ¿{confirming.label} el presupuesto <strong>{budget.code}</strong>? {CONFIRM[confirming.action]}
            </>
          }
          confirmLabel={confirming.label}
          variant={confirming.variant === 'danger' ? 'danger' : confirming.variant === 'warning' ? 'warning' : 'primary'}
          isLoading={action.isPending}
          onConfirm={() => action.mutate({ value: confirming.action })}
          onClose={() => setConfirming(null)}
        />
      )}
      {editingNotes && <NotesModal budget={budget} onClose={() => setEditingNotes(false)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar presupuesto"
          message={
            <>
              ¿Eliminar el borrador <strong>{budget.code}</strong> con sus ítems?
            </>
          }
          onDelete={() => budgetsApi.remove(budget.id)}
          invalidate={[['budgets'], ['receptions']]}
          successMessage="Presupuesto eliminado."
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate(can('receptions.show') ? `/receptions/${budget.reception_id}` : '/budgets', { replace: true })}
        />
      )}
    </>
  )
}

/** `editable`: borrador de una recepción abierta. */
function BudgetItemsTable({ budget, editable }: { budget: Budget; editable: boolean }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<BudgetItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BudgetItem | null>(null)

  const columns: Column<BudgetItem>[] = [
    {
      key: 'description',
      header: 'Ítem',
      render: (item) => (
        <>
          <div>{item.description}</div>
          <div className="small text-secondary">
            {[BUDGET_ITEM_TYPES[item.type], (item.part ?? item.service)?.code, item.notes].filter(Boolean).join(' · ')}
          </div>
        </>
      ),
    },
    { key: 'quantity', header: 'Cant.', className: 'text-end', render: (item) => formatDecimal(item.quantity) },
    { key: 'price', header: 'Precio unit.', className: 'text-end text-nowrap', render: (item) => formatMoney(item.unit_price) },
    {
      key: 'hours',
      header: 'Horas',
      className: 'text-end',
      render: (item) => (item.estimated_hours === null ? '—' : formatDecimal(item.estimated_hours)),
    },
    { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (item) => formatMoney(item.total) },
    ...(editable
      ? [
          {
            key: 'actions',
            header: <span className="visually-hidden">Acciones</span>,
            className: 'w-1 text-nowrap',
            render: (item: BudgetItem) => (
              <>
                {can('budget-items.update') && <IconButton label={`Editar ${item.description}`} icon={IconPencil} onClick={() => setEditing(item)} />}
                {can('budget-items.destroy') && (
                  <IconButton label={`Eliminar ${item.description}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(item)} />
                )}
              </>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <DataTable
        title="Ítems (precios sin IVA)"
        columns={columns}
        rows={budget.items ?? []}
        rowKey={(item) => item.id}
        emptyMessage={editable ? 'Agregue mano de obra, servicios o repuestos.' : 'El presupuesto no tiene ítems.'}
        toolbar={
          editable &&
          can('budget-items.store') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Agregar ítem
            </button>
          )
        }
      />
      {!editable && budget.status !== 'draft' && (
        <div className="small text-secondary mt-2">Solo los borradores se editan; un presupuesto rechazado se puede reabrir.</div>
      )}
      {editing && <BudgetItemFormModal budgetId={budget.id} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar ítem"
          message={
            <>
              ¿Eliminar <strong>{deleting.description}</strong>?
            </>
          }
          onDelete={() => budgetsApi.removeItem(budget.id, deleting.id)}
          invalidate={[['budgets']]}
          successMessage="Ítem eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function NotesModal({ budget, onClose }: { budget: Budget; onClose: () => void }) {
  const [notes, setNotes] = useState(budget.notes ?? '')
  const mutation = useApiMutation(() => budgetsApi.update(budget.id, nullIfEmpty(notes)), {
    invalidate: [['budgets']],
    successMessage: 'Notas actualizadas.',
    onSuccess: onClose,
  })

  return (
    <FormModal title="Notas del presupuesto" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      <TextareaField
        label="Notas"
        name="notes"
        rows={4}
        maxLength={500}
        autoFocus
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        errors={validationErrors(mutation.error)}
      />
    </FormModal>
  )
}
