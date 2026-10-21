import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { partCategoriesApi, type PartCategory } from '@/features/parts/api'
import { nullIfEmpty } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

export function PartCategoriesPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [active, setActive] = useState('')
  const [editing, setEditing] = useState<PartCategory | 'new' | null>(null)
  const [deleting, setDeleting] = useState<PartCategory | null>(null)

  const params = { ...list.params, is_active: active }
  const query = useQuery({
    queryKey: ['part-categories', params],
    queryFn: () => partCategoriesApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<PartCategory>[] = [
    {
      key: 'name',
      header: 'Categoría',
      render: (category) => (
        <>
          <div>{category.name}</div>
          {category.description && <div className="small text-secondary">{category.description}</div>}
        </>
      ),
    },
    { key: 'parts', header: 'Repuestos', className: 'text-end', render: (category) => category.parts_count ?? '—' },
    {
      key: 'status',
      header: 'Estado',
      render: (category) =>
        category.is_active ? <span className="badge bg-green-lt">Activa</span> : <span className="badge bg-secondary-lt">Inactiva</span>,
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (category) => (
        <>
          {can('part-categories.update') && (
            <IconButton label={`Editar ${category.name}`} icon={IconPencil} onClick={() => setEditing(category)} />
          )}
          {can('part-categories.destroy') && (
            <IconButton label={`Eliminar ${category.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(category)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Categorías de repuestos"
        actions={
          can('part-categories.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nueva categoría
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(category) => category.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar categoría…' }}
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
              <option value="">Todas</option>
              <option value="1">Activas</option>
              <option value="0">Inactivas</option>
            </select>
          }
        />
      </PageBody>
      {editing && <PartCategoryFormModal category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar categoría"
          message={
            <>
              ¿Eliminar la categoría <strong>{deleting.name}</strong>? Solo se puede si nunca tuvo repuestos: si no, desactívela.
            </>
          }
          onDelete={() => partCategoriesApi.remove(deleting.id)}
          invalidate={[['part-categories']]}
          successMessage="Categoría eliminada."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function PartCategoryFormModal({ category, onClose }: { category: PartCategory | null; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [isActive, setIsActive] = useState(category?.is_active ?? true)

  const mutation = useApiMutation(
    () => {
      const body = { name: name.trim(), description: nullIfEmpty(description), is_active: isActive }
      return category ? partCategoriesApi.update(category.id, body) : partCategoriesApi.create(body)
    },
    {
      invalidate: [['part-categories'], ['parts']],
      successMessage: category ? 'Categoría actualizada.' : 'Categoría creada.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={category ? 'Editar categoría' : 'Nueva categoría'}
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
      />
      <TextareaField
        label="Descripción"
        name="description"
        rows={3}
        maxLength={500}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        errors={errors}
      />
      <SwitchField
        label="Activa"
        name="is_active"
        checked={isActive}
        onChange={setIsActive}
        errors={errors}
        hint="Los repuestos nuevos solo pueden usar categorías activas."
      />
    </FormModal>
  )
}
