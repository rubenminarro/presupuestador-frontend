import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, SwitchField, TextField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { CHECKLIST_TYPE_LABELS, checklistsApi, type CheckListItem, type CheckListType } from '@/features/checklists/api'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

export function ChecklistsPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [editing, setEditing] = useState<CheckListItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CheckListItem | null>(null)
  const [active, setActive] = useState('')

  const params = { ...list.params, is_active: active }
  const query = useQuery({
    queryKey: ['checklists', params],
    queryFn: () => checklistsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<CheckListItem>[] = [
    { key: 'name', header: 'Ítem', render: (item) => item.name },
    { key: 'type', header: 'Tipo de respuesta', render: (item) => CHECKLIST_TYPE_LABELS[item.type] ?? item.type },
    {
      key: 'required',
      header: 'Obligatorio',
      render: (item) =>
        item.required ? <span className="badge bg-blue-lt">Obligatorio</span> : <span className="text-secondary">Opcional</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (item) => <span className={`badge ${item.is_active ? 'bg-green-lt' : 'bg-secondary-lt'}`}>{item.is_active ? 'Activo' : 'Inactivo'}</span>,
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (item) => (
        <>
          {can('checklists.update') && <IconButton label={`Editar ${item.name}`} icon={IconPencil} onClick={() => setEditing(item)} />}
          {can('checklists.destroy') && (
            <IconButton label={`Eliminar ${item.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(item)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Ítems de checklist"
        actions={
          can('checklists.store') && (
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
          rowKey={(item) => item.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar ítem…' }}
          toolbar={
            <select
              className="form-select form-select-sm w-auto"
              aria-label="Filtrar por estado"
              value={active}
              onChange={(event) => {
                setActive(event.target.value)
                list.setPage(1)
              }}
            >
              <option value="">Todos</option>
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
            </select>
          }
        />
        <div className="small text-secondary mt-2">
          Un ítem que ya se usó en recepciones no se elimina: desactívelo y deja de pedirse en las recepciones nuevas.
        </div>
      </PageBody>
      {editing && <ChecklistFormModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar ítem de checklist"
          message={
            <>
              ¿Eliminar <strong>{deleting.name}</strong>? Si ya se usó en recepciones no se puede eliminar: desactívelo.
            </>
          }
          onDelete={() => checklistsApi.remove(deleting.id)}
          invalidate={[['checklists']]}
          successMessage="Ítem eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function ChecklistFormModal({ item, onClose }: { item: CheckListItem | null; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [type, setType] = useState<CheckListType | ''>(item?.type ?? '')
  const [required, setRequired] = useState(Boolean(item?.required))
  const [isActive, setIsActive] = useState(item?.is_active ?? true)

  const mutation = useApiMutation(
    () => {
      const body = { name, type: type as CheckListType, required, is_active: isActive }
      return item ? checklistsApi.update(item.id, body) : checklistsApi.create(body)
    },
    {
      invalidate: [['checklists']],
      successMessage: item ? 'Ítem actualizado.' : 'Ítem creado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={item ? 'Editar ítem de checklist' : 'Nuevo ítem de checklist'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
    >
      <TextField
        label="Nombre"
        name="name"
        required
        autoFocus
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
        errors={errors}
        hint="Solo letras y espacios."
      />
      <SelectField
        label="Tipo de respuesta"
        name="type"
        required
        value={type}
        onChange={(event) => setType(event.target.value as CheckListType)}
        errors={errors}
      >
        <option value="">Seleccione un tipo</option>
        {Object.entries(CHECKLIST_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <SwitchField label="Obligatorio en la recepción" name="required" checked={required} onChange={setRequired} errors={errors} />
      <SwitchField
        label="Activo"
        name="is_active"
        checked={isActive}
        onChange={setIsActive}
        errors={errors}
        hint="Inactivo: no se pide en las recepciones nuevas (las anteriores lo conservan)."
      />
    </FormModal>
  )
}
