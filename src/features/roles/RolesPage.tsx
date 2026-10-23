import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/useAuth'
import {
  ADMINISTRATOR_ROLE,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  rolesApi,
  type PermissionGroup,
  type RoleDetail,
  type RoleInput,
  type RoleListItem,
} from '@/features/roles/api'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

export function RolesPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [editing, setEditing] = useState<RoleListItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<RoleListItem | null>(null)

  const query = useQuery({
    queryKey: ['roles', list.params],
    queryFn: () => rolesApi.list(list.params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<RoleListItem>[] = [
    { key: 'description', header: 'Rol', render: (role) => role.description ?? '—' },
    { key: 'name', header: 'Nombre interno', render: (role) => <code>{role.name}</code> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (role) => (
        <>
          {can('roles.update') && <IconButton label={`Editar ${role.name}`} icon={IconPencil} onClick={() => setEditing(role)} />}
          {/* El administrador no se elimina (ROLE_PROTECTED). */}
          {can('roles.destroy') && role.name !== ADMINISTRATOR_ROLE && (
            <IconButton label={`Eliminar ${role.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(role)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Roles"
        actions={
          can('roles.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo rol
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(role) => role.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar por nombre o descripción…' }}
        />
      </PageBody>
      {editing === 'new' && <RoleFormLoader roleId={null} onClose={() => setEditing(null)} />}
      {editing && editing !== 'new' && <RoleFormLoader roleId={editing.id} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar rol"
          message={
            <>
              ¿Eliminar el rol <strong>{deleting.description ?? deleting.name}</strong>? Solo se puede si ningún usuario lo tiene
              asignado.
            </>
          }
          onDelete={() => rolesApi.remove(deleting.id)}
          invalidate={[['roles']]}
          successMessage="Rol eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

/** El formulario necesita los permisos agrupados y, al editar, el detalle del rol (con los IDs de sus permisos). */
function RoleFormLoader({ roleId, onClose }: { roleId: number | null; onClose: () => void }) {
  const groups = useQuery({ queryKey: ['roles', 'permissions-by-module'], queryFn: rolesApi.permissionsByModule, staleTime: 5 * 60_000 })
  const detail = useQuery({
    queryKey: ['roles', 'detail', roleId],
    queryFn: () => rolesApi.show(roleId!),
    enabled: roleId !== null,
  })

  const error = groups.error ?? detail.error
  if (!groups.data || (roleId !== null && !detail.data)) {
    return (
      <FormModal title={roleId ? 'Editar rol' : 'Nuevo rol'} onClose={onClose} onSubmit={() => undefined} isSubmitting size="xl">
        {error ? (
          <ErrorState
            error={error}
            onRetry={() => {
              void groups.refetch()
              if (roleId !== null) void detail.refetch()
            }}
          />
        ) : (
          <LoadingState />
        )}
      </FormModal>
    )
  }

  return <RoleForm role={detail.data ?? null} groups={groups.data} onClose={onClose} />
}

function moduleLabel(module: string) {
  return PERMISSION_MODULES[module] ?? module
}

function actionLabel(permission: string) {
  const action = permission.slice(permission.indexOf('.') + 1)
  return PERMISSION_ACTIONS[action] ?? action
}

function RoleForm({ role, groups, onClose }: { role: RoleDetail | null; groups: PermissionGroup[]; onClose: () => void }) {
  const isAdministrator = role?.name === ADMINISTRATOR_ROLE
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [filter, setFilter] = useState('')
  // El detalle trae IDs; la API recibe nombres: se traducen con el listado agrupado.
  const [selected, setSelected] = useState<Set<string>>(() => {
    const ids = new Set(role?.permissions ?? [])
    return new Set(groups.flatMap((group) => group.list.filter((permission) => ids.has(permission.id)).map((permission) => permission.name)))
  })

  const visibleGroups = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return groups
    return groups.filter((group) => group.module.includes(term) || moduleLabel(group.module).toLowerCase().includes(term))
  }, [groups, filter])

  const mutation = useApiMutation(
    () => {
      const body: RoleInput = {
        name: name.trim(),
        description: description.trim(),
        guard_name: 'api',
        // El administrador tiene todos los permisos por el Gate::before: los suyos no se tocan.
        ...(!isAdministrator && { permissions: [...selected] }),
      }
      return role ? rolesApi.update(role.id, body) : rolesApi.create(body)
    },
    {
      // Cambiar los permisos de un rol cambia lo que ven sus usuarios (incluida la sesión actual al recargar).
      invalidate: [['roles'], ['users']],
      successMessage: role ? 'Rol actualizado.' : 'Rol creado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  function toggle(names: string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      names.forEach((permission) => (checked ? next.add(permission) : next.delete(permission)))
      return next
    })
  }

  return (
    <FormModal
      title={role ? `Editar rol ${role.description ?? role.name}` : 'Nuevo rol'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="xl"
    >
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Descripción"
            name="description"
            required
            minLength={10}
            maxLength={100}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            errors={errors}
            hint="Entre 10 y 100 caracteres, solo letras y espacios. Es el nombre que ven los usuarios."
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Nombre interno"
            name="name"
            required
            minLength={4}
            maxLength={200}
            disabled={isAdministrator}
            value={name}
            onChange={(event) => setName(event.target.value.toLowerCase())}
            errors={errors}
            hint={
              isAdministrator
                ? 'El rol administrador no se puede renombrar.'
                : 'Minúsculas, números, guiones o guiones bajos (p. ej. jefe-taller).'
            }
          />
        </div>
      </div>

      {isAdministrator ? (
        <div className="alert alert-info mb-0">El administrador tiene todos los permisos del sistema; no se asignan uno por uno.</div>
      ) : (
        <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <h4 className="mb-0 me-auto">
              Permisos <span className="text-secondary fw-normal">({selected.size} seleccionados)</span>
            </h4>
            <input
              type="search"
              className="form-control form-control-sm w-auto"
              placeholder="Filtrar módulos…"
              aria-label="Filtrar módulos"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
          {errors.permissions?.map((message) => (
            <div key={message} className="invalid-feedback d-block mb-2">
              {message}
            </div>
          ))}
          <div className="row g-2">
            {visibleGroups.map((group) => {
              const names = group.list.map((permission) => permission.name)
              const checkedCount = names.filter((permission) => selected.has(permission)).length
              return (
                <div key={group.module} className="col-12 col-md-6 col-lg-4">
                  <div className="card card-sm h-100">
                    <div className="card-body">
                      <label className="form-check mb-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={checkedCount === names.length}
                          ref={(input) => {
                            if (input) input.indeterminate = checkedCount > 0 && checkedCount < names.length
                          }}
                          onChange={(event) => toggle(names, event.target.checked)}
                        />
                        <span className="form-check-label fw-bold">{moduleLabel(group.module)}</span>
                      </label>
                      {group.list.map((permission) => (
                        <label key={permission.id} className="form-check mb-1" title={permission.name}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selected.has(permission.name)}
                            onChange={(event) => toggle([permission.name], event.target.checked)}
                          />
                          <span className="form-check-label">{actionLabel(permission.name)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </FormModal>
  )
}
