import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/useAuth'
import { useAllRoles } from '@/features/roles/api'
import { usersApi, type UserDetail, type UserInput, type UserListItem } from '@/features/users/api'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

const PASSWORD_HINT = 'Al menos 12 caracteres, con mayúsculas, minúsculas, números y símbolos; no puede ser una contraseña filtrada.'

export function UsersPage() {
  const { can, user: currentUser } = useAuth()
  const list = useListParams()
  const [editing, setEditing] = useState<UserListItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<UserListItem | null>(null)
  const roles = useAllRoles(can('roles.index'))

  const query = useQuery({
    queryKey: ['users', list.params],
    queryFn: () => usersApi.list(list.params),
    placeholderData: keepPreviousData,
  })

  const roleLabel = (name: string) => roles.data?.find((role) => role.name === name)?.description ?? name

  const columns: Column<UserListItem>[] = [
    {
      key: 'name',
      header: 'Usuario',
      render: (user) => (
        <>
          <div>
            {`${user.first_name} ${user.last_name}`.trim()}
            {user.id === currentUser?.id && <span className="badge bg-blue-lt ms-2">Vos</span>}
          </div>
          <div className="small text-secondary">{user.name}</div>
        </>
      ),
    },
    { key: 'email', header: 'Email', render: (user) => user.email },
    {
      key: 'role',
      header: 'Rol',
      render: (user) =>
        user.roles.length === 0 ? (
          <span className="text-secondary">Sin rol</span>
        ) : (
          user.roles.map((name) => (
            <span key={name} className="badge bg-secondary-lt me-1" title={name}>
              {roleLabel(name)}
            </span>
          ))
        ),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (user) => (
        <>
          {can('users.update') && <IconButton label={`Editar ${user.name}`} icon={IconPencil} onClick={() => setEditing(user)} />}
          {/* Nadie se elimina a sí mismo (USER_SELF_ACTION). */}
          {can('users.destroy') && user.id !== currentUser?.id && (
            <IconButton label={`Eliminar ${user.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(user)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Usuarios"
        actions={
          can('users.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo usuario
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(user) => user.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar por nombre, usuario, email o rol…' }}
        />
      </PageBody>
      {editing === 'new' && <UserForm user={null} onClose={() => setEditing(null)} />}
      {editing && editing !== 'new' && <EditUserModal userId={editing.id} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar usuario"
          message={
            <>
              ¿Eliminar al usuario <strong>{deleting.name}</strong>? Ya no podrá iniciar sesión; su nombre de usuario y su email
              quedan libres para otro usuario.
            </>
          }
          onDelete={() => usersApi.remove(deleting.id)}
          invalidate={[['users']]}
          successMessage="Usuario eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function EditUserModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['users', 'detail', userId], queryFn: () => usersApi.show(userId) })

  if (!detail.data) {
    return (
      <FormModal title="Editar usuario" onClose={onClose} onSubmit={() => undefined} isSubmitting>
        {detail.error ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : <LoadingState />}
      </FormModal>
    )
  }

  return <UserForm user={detail.data} onClose={onClose} />
}

function UserForm({ user, onClose }: { user: UserDetail | null; onClose: () => void }) {
  const { can, user: currentUser } = useAuth()
  const currentRole = user?.roles[0]?.name ?? ''
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [role, setRole] = useState(currentRole)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const roles = useAllRoles(can('roles.index'))
  // El propio rol no se cambia (USER_SELF_ACTION): lo hace otro administrador.
  const isSelf = user !== null && user.id === currentUser?.id

  const mutation = useApiMutation(
    () => {
      const body: UserInput = {
        name: name.trim(),
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        // El rol solo viaja si cambió, y la contraseña si se escribió una nueva.
        ...(role !== currentRole && { role }),
        ...(password !== '' && { password, password_confirmation: passwordConfirmation }),
      }
      return user ? usersApi.update(user.id, body) : usersApi.create(body)
    },
    {
      invalidate: [['users'], ['mechanics']],
      successMessage: user ? 'Usuario actualizado.' : 'Usuario creado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={user ? `Editar usuario ${user.name}` : 'Nuevo usuario'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Nombre"
            name="first_name"
            required
            maxLength={100}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Apellido"
            name="last_name"
            required
            maxLength={100}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Nombre de usuario"
            name="name"
            required
            minLength={4}
            maxLength={20}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value.toLowerCase())}
            errors={errors}
            hint="Entre 4 y 20 caracteres: minúsculas, números, guiones o guiones bajos."
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Email"
            name="email"
            type="email"
            required
            maxLength={50}
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value.toLowerCase())}
            errors={errors}
            hint="Es el dato con el que inicia sesión."
          />
        </div>
        <div className="col-md-6">
          <SelectField
            label="Rol"
            name="role"
            required
            value={role}
            onChange={(event) => setRole(event.target.value)}
            errors={errors}
            disabled={isSelf || roles.isPending}
            hint={isSelf ? 'No puede cambiar su propio rol: debe hacerlo otro administrador.' : undefined}
          >
            <option value="">{roles.isPending ? 'Cargando…' : 'Seleccione un rol'}</option>
            {roles.data?.map((item) => (
              <option key={item.id} value={item.name}>
                {item.description ? `${item.description} (${item.name})` : item.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <h4 className="mt-2">{user ? 'Cambiar contraseña' : 'Contraseña'}</h4>
      {user && <p className="text-secondary small">Dejar en blanco para mantener la actual.</p>}
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            required={!user}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            errors={errors}
            hint={PASSWORD_HINT}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Repetir contraseña"
            name="password_confirmation"
            type="password"
            required={!user || password !== ''}
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            errors={errors}
          />
        </div>
      </div>
    </FormModal>
  )
}
