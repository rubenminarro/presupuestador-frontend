import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconBan, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { PhotoGallery } from '@/components/ui/PhotoGallery'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { ReceptionBudgets } from '@/features/budgets/ReceptionBudgets'
import { DIAGNOSTIC_STATUS, diagnosticsApi, PRIORITY, type DiagnosticSummary } from '@/features/diagnostics/api'
import { DiagnosticFormModal } from '@/features/diagnostics/DiagnosticFormModal'
import { isReceptionOpen, RECEPTION_STATUS, receptionsApi, receptionVehicleLabel, type Reception } from '@/features/receptions/api'
import { ReceptionCheckListCard } from '@/features/receptions/ReceptionCheckListCard'
import { ReceptionFormModal } from '@/features/receptions/ReceptionFormModal'
import { ReceptionWorkOrders } from '@/features/work-orders/ReceptionWorkOrders'
import { formatDate, formatDateTime } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

export function ReceptionDetailPage() {
  const { id } = useParams()
  const receptionId = Number(id)

  const query = useQuery({
    queryKey: ['receptions', 'detail', receptionId],
    queryFn: () => receptionsApi.show(receptionId),
    enabled: Number.isInteger(receptionId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Recepciones" title="Recepción" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <ReceptionDetail reception={query.data} />
}

/**
 * Ficha de la recepción: el eje del trabajo sobre el vehículo. Las fases siguientes suman presupuestos, OT, factura y
 * entrega.
 */
function ReceptionDetail({ reception }: { reception: Reception }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const open = isReceptionOpen(reception.status.value)
  const pending = reception.status.value === 'pending'

  const cancel = useApiMutation((reason: string) => receptionsApi.cancel(reception.id, reason), {
    invalidate: [['receptions']],
    successMessage: 'Recepción cancelada.',
    onSuccess: () => setCancelling(false),
  })

  return (
    <>
      <PageHeader
        pretitle={`Recepción · ${formatDate(reception.reception_date)}`}
        title={`#${reception.id} · ${receptionVehicleLabel(reception.vehicle)}`}
        actions={
          <>
            <Link to="/receptions" className="btn btn-link">
              <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
              Recepciones
            </Link>
            {can('receptions.update') && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setEditing(true)}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar
              </button>
            )}
            {can('receptions.cancel') && open && (
              <button type="button" className="btn btn-outline-warning" onClick={() => setCancelling(true)}>
                <IconBan size={18} className="me-1" aria-hidden="true" />
                Cancelar
              </button>
            )}
            {can('receptions.destroy') && pending && (
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
          <div className="col-12 col-lg-5">
            <ReceptionDataCard reception={reception} />
          </div>
          <div className="col-12 col-lg-7">
            {reception.check_list && can('reception-check-lists.show') ? (
              <ReceptionCheckListCard checkListId={reception.check_list.id} editable={pending} />
            ) : (
              <div className="card">
                <div className="card-body text-secondary">Sin checklist.</div>
              </div>
            )}
          </div>
          {can('diagnostics.index') && (
            <div className="col-12">
              <ReceptionDiagnostics reception={reception} />
            </div>
          )}
          {can('budgets.index') && (
            <div className="col-12">
              <ReceptionBudgets reception={reception} />
            </div>
          )}
          {can('work-orders.index') && (
            <div className="col-12">
              <ReceptionWorkOrders receptionId={reception.id} />
            </div>
          )}
          {can('receptions-photos.index') && (
            <div className="col-12">
              <ReceptionPhotos reception={reception} />
            </div>
          )}
        </div>
      </PageBody>

      {editing && <ReceptionFormModal reception={reception} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={cancelling}
        title="Cancelar recepción"
        message={
          <>
            ¿Cancelar la recepción <strong>#{reception.id}</strong>? Es definitivo: no admite presupuestos, OT ni diagnósticos nuevos.
            Si tiene OT vigentes, primero hay que cancelarlas.
          </>
        }
        confirmLabel="Cancelar recepción"
        variant="warning"
        reason={{ label: 'Motivo de la cancelación' }}
        isLoading={cancel.isPending}
        error={cancel.error}
        onConfirm={(reason) => cancel.mutate(reason ?? '')}
        onClose={() => setCancelling(false)}
      />
      {deleting && (
        <DeleteDialog
          title="Eliminar recepción"
          message={
            <>
              ¿Eliminar la recepción <strong>#{reception.id}</strong>? Solo se puede mientras está pendiente.
            </>
          }
          onDelete={() => receptionsApi.remove(reception.id)}
          invalidate={[['receptions']]}
          successMessage="Recepción eliminada."
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate('/receptions', { replace: true })}
        />
      )}
    </>
  )
}

function ReceptionDataCard({ reception }: { reception: Reception }) {
  const { can } = useAuth()
  const vehicle = reception.vehicle

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Datos de la recepción</h3>
        <div className="card-actions">
          <StatusBadge value={reception.status.value} map={RECEPTION_STATUS} />
        </div>
      </div>
      <div className="card-body">
        <dl className="row mb-0">
          <dt className="col-5">Cliente</dt>
          <dd className="col-7">
            {can('clients.show') ? <Link to={`/clients/${reception.client.id}`}>{reception.client.full_name}</Link> : reception.client.full_name}
            <div className="small text-secondary">
              {[reception.client.document_number, reception.client.phone].filter(Boolean).join(' · ')}
            </div>
          </dd>
          <dt className="col-5">Vehículo</dt>
          <dd className="col-7">
            {receptionVehicleLabel(vehicle)}
            <div className="small text-secondary">
              {[vehicle.brand, vehicle.model, vehicle.year, vehicle.color.label].filter(Boolean).join(' · ')}
            </div>
          </dd>
          <dt className="col-5">Ingreso</dt>
          <dd className="col-7">{formatDate(reception.reception_date)}</dd>
          <dt className="col-5">Entrega estimada</dt>
          <dd className="col-7">{formatDate(reception.estimated_delivery_date)}</dd>
          <dt className="col-5">Kilometraje</dt>
          <dd className="col-7">{reception.mileage === null ? '—' : `${new Intl.NumberFormat('es-PY').format(reception.mileage)} km`}</dd>
          <dt className="col-5">Combustible</dt>
          <dd className="col-7">{reception.fuel.label ?? '—'}</dd>
          <dt className="col-5">Categorías</dt>
          <dd className="col-7">
            {reception.service_categories.map((category) => (
              <span key={category.id} className="badge bg-azure-lt me-1">
                {category.name}
              </span>
            ))}
          </dd>
          <dt className="col-5">Registró</dt>
          <dd className="col-7">{reception.created_by?.name ?? '—'}</dd>
          {reception.problem_description && (
            <>
              <dt className="col-12">Problema informado</dt>
              <dd className="col-12" style={{ whiteSpace: 'pre-line' }}>
                {reception.problem_description}
              </dd>
            </>
          )}
          {reception.observations && (
            <>
              <dt className="col-12">Observaciones</dt>
              <dd className="col-12" style={{ whiteSpace: 'pre-line' }}>
                {reception.observations}
              </dd>
            </>
          )}
          {reception.status.value === 'cancelled' && (
            <>
              <dt className="col-12 text-red">Cancelada el {formatDateTime(reception.cancelled_at)}</dt>
              <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                {reception.cancellation_reason}
              </dd>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}

function ReceptionDiagnostics({ reception }: { reception: Reception }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const params = { reception_id: reception.id, per_page: 50 }

  const query = useQuery({
    queryKey: ['diagnostics', params],
    queryFn: () => diagnosticsApi.list(params),
  })

  const columns: Column<DiagnosticSummary>[] = [
    { key: 'id', header: 'N.º', className: 'text-nowrap', render: (diagnostic) => <span className="text-secondary">#{diagnostic.id}</span> },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (diagnostic) => formatDateTime(diagnostic.diagnosed_at) },
    {
      key: 'diagnosis',
      header: 'Diagnóstico',
      render: (diagnostic) => diagnostic.diagnosis ?? diagnostic.customer_complaint ?? <span className="text-secondary">Sin detalle</span>,
    },
    {
      key: 'mechanic',
      header: 'Mecánico',
      render: (diagnostic) => (diagnostic.mechanic ? `${diagnostic.mechanic.first_name} ${diagnostic.mechanic.last_name}` : '—'),
    },
    { key: 'priority', header: 'Prioridad', render: (diagnostic) => <StatusBadge value={diagnostic.priority} map={PRIORITY} /> },
    { key: 'status', header: 'Estado', render: (diagnostic) => <StatusBadge value={diagnostic.status} map={DIAGNOSTIC_STATUS} /> },
  ]

  return (
    <>
      <DataTable
        title="Diagnósticos"
        columns={columns}
        rows={query.data?.items}
        rowKey={(diagnostic) => diagnostic.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="La recepción no tiene diagnósticos."
        onRowClick={can('diagnostics.show') ? (diagnostic) => navigate(`/diagnostics/${diagnostic.id}`) : undefined}
        toolbar={
          can('diagnostics.store') &&
          isReceptionOpen(reception.status.value) && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Nuevo diagnóstico
            </button>
          )
        }
      />
      {creating && (
        <DiagnosticFormModal
          diagnostic={null}
          receptionId={reception.id}
          defaultComplaint={reception.problem_description}
          onClose={() => setCreating(false)}
          onCreated={can('diagnostics.show') ? (diagnostic) => navigate(`/diagnostics/${diagnostic.id}`) : undefined}
        />
      )}
    </>
  )
}

function ReceptionPhotos({ reception }: { reception: Reception }) {
  const { can } = useAuth()
  const queryKey = ['receptions', 'photos', reception.id]
  const query = useQuery({ queryKey, queryFn: () => receptionsApi.photos(reception.id) })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Fotos del ingreso</h3>
      </div>
      <div className="card-body">
        {query.data ? (
          <PhotoGallery
            photos={query.data}
            invalidate={[queryKey]}
            onUpload={can('receptions-photos.store') ? (files, description) => receptionsApi.uploadPhotos(reception.id, files, description) : undefined}
            onUpdate={
              can('receptions-photos.update') ? (photo, description) => receptionsApi.updatePhoto(reception.id, photo.id, description) : undefined
            }
            onDelete={can('receptions-photos.destroy') ? (photo) => receptionsApi.removePhoto(reception.id, photo.id) : undefined}
            emptyMessage="No se cargaron fotos del vehículo."
          />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <LoadingState />
        )}
      </div>
    </div>
  )
}
