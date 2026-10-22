import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconPencil, IconPhoto, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { PhotoGallery } from '@/components/ui/PhotoGallery'
import { SelectField, SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import {
  DIAGNOSTIC_ITEM_STATUS,
  DIAGNOSTIC_STATUS,
  diagnosticsApi,
  PRIORITY,
  SEVERITY,
  type Diagnostic,
  type DiagnosticItem,
  type DiagnosticItemInput,
} from '@/features/diagnostics/api'
import { DiagnosticFormModal } from '@/features/diagnostics/DiagnosticFormModal'
import { RECEPTION_STATUS, receptionVehicleLabel } from '@/features/receptions/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

export function DiagnosticDetailPage() {
  const { id } = useParams()
  const diagnosticId = Number(id)

  const query = useQuery({
    queryKey: ['diagnostics', 'detail', diagnosticId],
    queryFn: () => diagnosticsApi.show(diagnosticId),
    enabled: Number.isInteger(diagnosticId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Diagnósticos" title="Diagnóstico" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <DiagnosticDetail diagnostic={query.data} />
}

function DiagnosticDetail({ diagnostic }: { diagnostic: Diagnostic }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const reception = diagnostic.reception

  return (
    <>
      <PageHeader
        pretitle={`Diagnóstico · ${formatDateTime(diagnostic.diagnosed_at)}`}
        title={`#${diagnostic.id}${reception ? ` · ${receptionVehicleLabel(reception.vehicle)}` : ''}`}
        actions={
          <>
            {can('receptions.show') ? (
              <Link to={`/receptions/${diagnostic.reception_id}`} className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Recepción #{diagnostic.reception_id}
              </Link>
            ) : (
              <Link to="/diagnostics" className="btn btn-link">
                <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
                Diagnósticos
              </Link>
            )}
            {can('diagnostics.update') && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setEditing(true)}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar
              </button>
            )}
            {can('diagnostics.destroy') && (
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
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Diagnóstico</h3>
                <div className="card-actions">
                  <StatusBadge value={diagnostic.status} map={DIAGNOSTIC_STATUS} />
                </div>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-5">Prioridad</dt>
                  <dd className="col-7">
                    <StatusBadge value={diagnostic.priority} map={PRIORITY} />
                  </dd>
                  <dt className="col-5">Mecánico</dt>
                  <dd className="col-7">{diagnostic.mechanic?.user?.full_name ?? 'Sin asignar'}</dd>
                  <dt className="col-5">Requiere</dt>
                  <dd className="col-7">
                    {diagnostic.requires_parts && <span className="badge bg-orange-lt me-1">Repuestos</span>}
                    {diagnostic.requires_repair && <span className="badge bg-orange-lt me-1">Reparación</span>}
                    {!diagnostic.requires_parts && !diagnostic.requires_repair && '—'}
                  </dd>
                  {reception && (
                    <>
                      <dt className="col-5">Recepción</dt>
                      <dd className="col-7">
                        #{reception.id} <StatusBadge value={reception.status.value} map={RECEPTION_STATUS} />
                        <div className="small text-secondary">
                          {reception.client.full_name} · {[reception.vehicle.brand, reception.vehicle.model].filter(Boolean).join(' ')}
                        </div>
                      </dd>
                    </>
                  )}
                  {(
                    [
                      ['Queja del cliente', diagnostic.customer_complaint],
                      ['Diagnóstico', diagnostic.diagnosis],
                      ['Recomendación', diagnostic.recommendation],
                    ] as const
                  ).map(
                    ([label, text]) =>
                      text && (
                        <div key={label} className="col-12">
                          <dt>{label}</dt>
                          <dd style={{ whiteSpace: 'pre-line' }}>{text}</dd>
                        </div>
                      ),
                  )}
                </dl>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-7">
            <DiagnosticItemsTable diagnostic={diagnostic} />
          </div>
        </div>
      </PageBody>

      {editing && <DiagnosticFormModal diagnostic={diagnostic} onClose={() => setEditing(false)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar diagnóstico"
          message={
            <>
              ¿Eliminar el diagnóstico <strong>#{diagnostic.id}</strong> con sus ítems?
            </>
          }
          onDelete={() => diagnosticsApi.remove(diagnostic.id)}
          invalidate={[['diagnostics']]}
          successMessage="Diagnóstico eliminado."
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate(can('receptions.show') ? `/receptions/${diagnostic.reception_id}` : '/diagnostics', { replace: true })}
        />
      )}
    </>
  )
}

function DiagnosticItemsTable({ diagnostic }: { diagnostic: Diagnostic }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<DiagnosticItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<DiagnosticItem | null>(null)
  // Por id: al subir fotos el detalle se refresca y el modal muestra el ítem actualizado.
  const [photosItemId, setPhotosItemId] = useState<number | null>(null)
  const items = diagnostic.items ?? []
  const photosItem = items.find((item) => item.id === photosItemId)

  const columns: Column<DiagnosticItem>[] = [
    {
      key: 'title',
      header: 'Ítem',
      render: (item) => (
        <>
          <div>{item.title}</div>
          {item.description && <div className="small text-secondary">{item.description}</div>}
        </>
      ),
    },
    { key: 'severity', header: 'Severidad', render: (item) => <StatusBadge value={item.severity} map={SEVERITY} /> },
    { key: 'status', header: 'Estado', render: (item) => <StatusBadge value={item.status} map={DIAGNOSTIC_ITEM_STATUS} /> },
    {
      key: 'estimate',
      header: 'Estimado',
      className: 'text-end text-nowrap',
      render: (item) => (
        <>
          <div>{item.estimated_cost === null ? '—' : formatMoney(item.estimated_cost)}</div>
          {item.estimated_time !== null && <div className="small text-secondary">{item.estimated_time} min</div>}
        </>
      ),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (item) => (
        <>
          {can('diagnostic-item-photos.index') && (
            <IconButton label={`Fotos de ${item.title} (${item.photos?.length ?? 0})`} icon={IconPhoto} onClick={() => setPhotosItemId(item.id)} />
          )}
          {can('diagnostic-items.update') && <IconButton label={`Editar ${item.title}`} icon={IconPencil} onClick={() => setEditing(item)} />}
          {can('diagnostic-items.destroy') && (
            <IconButton label={`Eliminar ${item.title}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(item)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <DataTable
        title="Ítems revisados"
        columns={columns}
        rows={items}
        rowKey={(item) => item.id}
        emptyMessage="El diagnóstico no tiene ítems."
        toolbar={
          can('diagnostic-items.store') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Agregar ítem
            </button>
          )
        }
      />
      {editing && (
        <DiagnosticItemFormModal diagnosticId={diagnostic.id} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <DeleteDialog
          title="Eliminar ítem"
          message={
            <>
              ¿Eliminar <strong>{deleting.title}</strong>? También se eliminan sus fotos.
            </>
          }
          onDelete={() => diagnosticsApi.removeItem(deleting.id)}
          invalidate={[['diagnostics']]}
          successMessage="Ítem eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
      {photosItem && (
        <Modal open title={`Fotos · ${photosItem.title}`} onClose={() => setPhotosItemId(null)} size="lg">
          <PhotoGallery
            photos={photosItem.photos ?? []}
            invalidate={[['diagnostics']]}
            onUpload={
              can('diagnostic-item-photos.store')
                ? (files, description) => diagnosticsApi.uploadItemPhotos(photosItem.id, files, description)
                : undefined
            }
            onUpdate={
              can('diagnostic-item-photos.update')
                ? (photo, description) => diagnosticsApi.updateItemPhoto(photosItem.id, photo.id, description)
                : undefined
            }
            onDelete={can('diagnostic-item-photos.destroy') ? (photo) => diagnosticsApi.removeItemPhoto(photosItem.id, photo.id) : undefined}
            descriptionRequired
          />
        </Modal>
      )}
    </>
  )
}

function DiagnosticItemFormModal({ diagnosticId, item, onClose }: { diagnosticId: number; item: DiagnosticItem | null; onClose: () => void }) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [severity, setSeverity] = useState<string>(item?.severity ?? 'medium')
  const [status, setStatus] = useState<string>(item?.status ?? 'pending')
  const [requiresRepair, setRequiresRepair] = useState(item?.requires_repair ?? false)
  const [requiresReplacement, setRequiresReplacement] = useState(item?.requires_replacement ?? false)
  const [cost, setCost] = useState(toInput(item?.estimated_cost))
  const [time, setTime] = useState(toInput(item?.estimated_time))
  const [recommendation, setRecommendation] = useState(item?.recommendation ?? '')

  const mutation = useApiMutation(
    () => {
      const body: DiagnosticItemInput = {
        title: title.trim(),
        description: nullIfEmpty(description),
        severity,
        status,
        requires_repair: requiresRepair,
        requires_replacement: requiresReplacement,
        estimated_cost: toNumber(cost),
        estimated_time: toNumber(time),
        recommendation: nullIfEmpty(recommendation),
      }
      return item ? diagnosticsApi.updateItem(item.id, body) : diagnosticsApi.createItem({ ...body, diagnostic_id: diagnosticId })
    },
    {
      invalidate: [['diagnostics']],
      successMessage: item ? 'Ítem actualizado.' : 'Ítem agregado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={item ? 'Editar ítem' : 'Nuevo ítem'} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} size="lg">
      <TextField
        label="Ítem"
        name="title"
        required
        autoFocus
        maxLength={255}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        errors={errors}
        hint="Solo letras, números y espacios (p. ej. Pastillas delanteras)."
      />
      <TextareaField label="Descripción" name="description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} errors={errors} />
      <div className="row">
        <div className="col-md-6">
          <SelectField label="Severidad" name="severity" required value={severity} onChange={(event) => setSeverity(event.target.value)} errors={errors}>
            {Object.entries(SEVERITY).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-6">
          <SelectField label="Estado" name="status" required value={status} onChange={(event) => setStatus(event.target.value)} errors={errors}>
            {Object.entries(DIAGNOSTIC_ITEM_STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-6">
          <TextField
            label="Costo estimado"
            name="estimated_cost"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            errors={errors}
            hint="Referencia, sin IVA. El precio real sale del presupuesto."
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Tiempo estimado (min)"
            name="estimated_time"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-sm-6">
          <SwitchField label="Requiere reparación" name="requires_repair" checked={requiresRepair} onChange={setRequiresRepair} errors={errors} />
        </div>
        <div className="col-sm-6">
          <SwitchField label="Requiere reemplazo" name="requires_replacement" checked={requiresReplacement} onChange={setRequiresReplacement} errors={errors} />
        </div>
      </div>
      <TextareaField
        label="Recomendación"
        name="recommendation"
        rows={2}
        value={recommendation}
        onChange={(event) => setRecommendation(event.target.value)}
        errors={errors}
      />
    </FormModal>
  )
}
