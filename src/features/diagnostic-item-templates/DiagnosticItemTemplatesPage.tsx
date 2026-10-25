import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlayerPause, IconPlayerPlay, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import {
  DIAGNOSTIC_ITEM_TEMPLATE_STATUS,
  diagnosticItemTemplatesApi,
  type DiagnosticItemTemplate,
  type DiagnosticItemTemplateInput,
} from '@/features/diagnostic-item-templates/api'
import { SEVERITY } from '@/features/diagnostics/api'
import { useServiceCategories } from '@/features/services/api'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

/**
 * Catálogo de ítems de diagnóstico: al cargar un diagnóstico se eligen de aquí y el ítem copia sus valores, así que
 * editar, desactivar o eliminar una entrada no cambia los diagnósticos ya cargados.
 */
export function DiagnosticItemTemplatesPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<DiagnosticItemTemplate | 'new' | null>(null)
  const [deleting, setDeleting] = useState<DiagnosticItemTemplate | null>(null)
  const categories = useServiceCategories()

  const params = { ...list.params, category_id: categoryId, status }
  const query = useQuery({
    queryKey: ['diagnostic-item-templates', params],
    queryFn: () => diagnosticItemTemplatesApi.list(params),
    placeholderData: keepPreviousData,
  })

  const toggleStatus = useApiMutation(
    (template: DiagnosticItemTemplate) =>
      template.status.value === 'active' ? diagnosticItemTemplatesApi.deactivate(template.id) : diagnosticItemTemplatesApi.activate(template.id),
    { invalidate: [['diagnostic-item-templates']], successMessage: 'Estado del ítem actualizado.' },
  )

  const columns: Column<DiagnosticItemTemplate>[] = [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (template) => <span className="text-secondary">{template.code}</span> },
    {
      key: 'title',
      header: 'Ítem',
      render: (template) => (
        <>
          <div>{template.title}</div>
          {template.description && <div className="small text-secondary">{template.description}</div>}
        </>
      ),
    },
    { key: 'category', header: 'Categoría', render: (template) => template.category?.name ?? '—' },
    { key: 'severity', header: 'Severidad', render: (template) => <StatusBadge value={template.severity} map={SEVERITY} /> },
    {
      key: 'flags',
      header: 'Sugiere',
      render: (template) =>
        template.requires_repair || template.requires_replacement ? (
          <div className="d-flex flex-wrap gap-1">
            {template.requires_repair && <span className="badge bg-orange-lt">Reparación</span>}
            {template.requires_replacement && <span className="badge bg-red-lt">Reemplazo</span>}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'time',
      header: 'Tiempo est.',
      className: 'text-end text-nowrap',
      render: (template) => (template.estimated_time === null ? '—' : `${template.estimated_time} min`),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (template) => <StatusBadge value={template.status.value} map={DIAGNOSTIC_ITEM_TEMPLATE_STATUS} />,
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (template) => (
        <>
          {can('diagnostic-item-templates.update') && (
            <IconButton label={`Editar ${template.title}`} icon={IconPencil} onClick={() => setEditing(template)} />
          )}
          {can('diagnostic-item-templates.change-status') && (
            <IconButton
              label={template.status.value === 'active' ? `Desactivar ${template.title}` : `Activar ${template.title}`}
              icon={template.status.value === 'active' ? IconPlayerPause : IconPlayerPlay}
              variant={template.status.value === 'active' ? 'warning' : 'success'}
              disabled={toggleStatus.isPending}
              onClick={() => toggleStatus.mutate(template)}
            />
          )}
          {can('diagnostic-item-templates.destroy') && (
            <IconButton label={`Eliminar ${template.title}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(template)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Ítems de diagnóstico"
        actions={
          can('diagnostic-item-templates.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo ítem
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(template) => template.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          emptyMessage="No hay ítems en el catálogo."
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar por código o ítem…' }}
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por categoría"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value)
                  list.setPage(1)
                }}
              >
                <option value="">Todas las categorías</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  list.setPage(1)
                }}
              >
                <option value="">Todos los estados</option>
                {Object.entries(DIAGNOSTIC_ITEM_TEMPLATE_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          }
        />
      </PageBody>
      {editing && <DiagnosticItemTemplateFormModal template={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar ítem del catálogo"
          message={
            <>
              ¿Eliminar <strong>{deleting.title}</strong> del catálogo? Los diagnósticos que ya lo usan conservan sus datos.
              Para dejar de ofrecerlo sin eliminarlo, desactívelo.
            </>
          }
          onDelete={() => diagnosticItemTemplatesApi.remove(deleting.id)}
          invalidate={[['diagnostic-item-templates']]}
          successMessage="Ítem eliminado del catálogo."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function DiagnosticItemTemplateFormModal({ template, onClose }: { template: DiagnosticItemTemplate | null; onClose: () => void }) {
  const categories = useServiceCategories()
  const [categoryId, setCategoryId] = useState(toInput(template?.service_category_id))
  const [title, setTitle] = useState(template?.title ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [severity, setSeverity] = useState<string>(template?.severity ?? 'medium')
  const [requiresRepair, setRequiresRepair] = useState(template?.requires_repair ?? false)
  const [requiresReplacement, setRequiresReplacement] = useState(template?.requires_replacement ?? false)
  const [time, setTime] = useState(toInput(template?.estimated_time))
  const [recommendation, setRecommendation] = useState(template?.recommendation ?? '')

  const mutation = useApiMutation(
    () => {
      const body: DiagnosticItemTemplateInput = {
        service_category_id: toNumber(categoryId),
        title: title.trim(),
        description: nullIfEmpty(description),
        severity,
        requires_repair: requiresRepair,
        requires_replacement: requiresReplacement,
        estimated_time: toNumber(time),
        recommendation: nullIfEmpty(recommendation),
      }
      return template ? diagnosticItemTemplatesApi.update(template.id, body) : diagnosticItemTemplatesApi.create(body)
    },
    {
      invalidate: [['diagnostic-item-templates']],
      successMessage: template ? 'Ítem del catálogo actualizado.' : 'Ítem agregado al catálogo.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={template ? `Editar ítem ${template.code}` : 'Nuevo ítem del catálogo'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        <div className="col-md-8">
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
        </div>
        <div className="col-md-4">
          <SelectField
            label="Categoría"
            name="service_category_id"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            errors={errors}
            hint="Opcional, para filtrar."
          >
            <option value="">Sin categoría</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <TextareaField
        label="Descripción"
        name="description"
        rows={2}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        errors={errors}
        hint="Qué se revisa. Se copia al ítem del diagnóstico y se puede completar ahí."
      />
      <div className="row">
        <div className="col-md-6">
          <SelectField
            label="Severidad sugerida"
            name="severity"
            required
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            errors={errors}
          >
            {Object.entries(SEVERITY).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
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
          <SwitchField
            label="Requiere reemplazo"
            name="requires_replacement"
            checked={requiresReplacement}
            onChange={setRequiresReplacement}
            errors={errors}
          />
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
