import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { MECHANIC_STATUS, mechanicsApi, type Mechanic, type MechanicInput, type MechanicStatus } from '@/features/mechanics/api'
import { formatDecimal, formatMoney } from '@/lib/format'
import { compact, nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { getPage, validationErrors } from '@/services/api'
import type { User } from '@/types/auth'

export function MechanicsPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Mechanic | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Mechanic | null>(null)

  const params = { ...list.params, status }
  const query = useQuery({
    queryKey: ['mechanics', params],
    queryFn: () => mechanicsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<Mechanic>[] = [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (mechanic) => <span className="text-secondary">{mechanic.employee_code}</span> },
    {
      key: 'name',
      header: 'Mecánico',
      render: (mechanic) => (
        <>
          <div>{mechanic.user?.full_name ?? '—'}</div>
          {mechanic.user && <div className="small text-secondary">{mechanic.user.email}</div>}
        </>
      ),
    },
    { key: 'specialty', header: 'Especialidad', render: (mechanic) => mechanic.specialty ?? '—' },
    { key: 'hour_cost', header: 'Costo hora', className: 'text-end text-nowrap', render: (mechanic) => formatMoney(mechanic.hour_cost) },
    {
      key: 'commission',
      header: 'Comisión',
      className: 'text-end text-nowrap',
      render: (mechanic) => (mechanic.commission_percentage === null ? '—' : `${formatDecimal(mechanic.commission_percentage)} %`),
    },
    { key: 'status', header: 'Estado', render: (mechanic) => <StatusBadge value={mechanic.status.value} map={MECHANIC_STATUS} /> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (mechanic) => (
        <>
          {can('mechanics.update') && (
            <IconButton label={`Editar ${mechanic.employee_code}`} icon={IconPencil} onClick={() => setEditing(mechanic)} />
          )}
          {can('mechanics.destroy') && (
            <IconButton label={`Eliminar ${mechanic.employee_code}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(mechanic)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Mecánicos"
        actions={
          can('mechanics.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo mecánico
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(mechanic) => mechanic.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar por código, nombre o especialidad…' }}
          toolbar={
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
              {Object.entries(MECHANIC_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          }
        />
      </PageBody>
      {editing === 'new' && <MechanicForm mechanic={null} onClose={() => setEditing(null)} />}
      {editing && editing !== 'new' && <EditMechanicModal mechanicId={editing.id} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar mecánico"
          message={
            <>
              ¿Eliminar al mecánico <strong>{deleting.user?.full_name ?? deleting.employee_code}</strong>? Para dejar de
              asignarle trabajos sin borrarlo, márquelo como inactivo.
            </>
          }
          onDelete={() => mechanicsApi.remove(deleting.id)}
          invalidate={[['mechanics']]}
          successMessage="Mecánico eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

/** El listado no trae las notas: la edición parte del detalle. */
function EditMechanicModal({ mechanicId, onClose }: { mechanicId: number; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['mechanics', 'detail', mechanicId],
    queryFn: () => mechanicsApi.show(mechanicId),
  })

  if (!detail.data) {
    return (
      <FormModal title="Editar mecánico" onClose={onClose} onSubmit={() => undefined} isSubmitting>
        {detail.error ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : <LoadingState />}
      </FormModal>
    )
  }

  return <MechanicForm mechanic={detail.data} onClose={onClose} />
}

function MechanicForm({ mechanic, onClose }: { mechanic: Mechanic | null; onClose: () => void }) {
  const { can } = useAuth()
  const [userId, setUserId] = useState('')
  const [employeeCode, setEmployeeCode] = useState(mechanic?.employee_code ?? '')
  const [specialty, setSpecialty] = useState(mechanic?.specialty ?? '')
  const [hireDate, setHireDate] = useState(mechanic?.hire_date ?? '')
  const [hourCost, setHourCost] = useState(toInput(mechanic?.hour_cost))
  const [commission, setCommission] = useState(toInput(mechanic?.commission_percentage))
  const [status, setStatus] = useState<MechanicStatus>(mechanic?.status.value ?? 'active')
  const [notes, setNotes] = useState(mechanic?.notes ?? '')

  // Solo al crear: el usuario se elige de la lista de usuarios (permiso de administración).
  const canListUsers = can('users.index')
  const users = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => (await getPage<User>('/users', { per_page: 1000 })).items,
    enabled: mechanic === null && canListUsers,
    staleTime: 5 * 60_000,
  })

  const mutation = useApiMutation(
    () => {
      const body: MechanicInput = {
        employee_code: employeeCode.trim(),
        specialty: nullIfEmpty(specialty),
        hire_date: hireDate || null,
        notes: nullIfEmpty(notes),
        // Costo y comisión no admiten null (422): vacíos no se envían; en el alta quedan en 0, al editar no cambian.
        ...compact({ hour_cost: toNumber(hourCost), commission_percentage: toNumber(commission) }),
      }
      return mechanic
        ? mechanicsApi.update(mechanic.id, { ...body, status })
        : mechanicsApi.create({ ...body, user_id: toNumber(userId) ?? undefined })
    },
    {
      invalidate: [['mechanics']],
      successMessage: mechanic ? 'Mecánico actualizado.' : 'Mecánico creado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={mechanic ? `Editar mecánico ${mechanic.employee_code}` : 'Nuevo mecánico'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        <div className="col-md-6">
          {mechanic ? (
            <div className="mb-3">
              <div className="form-label">Usuario</div>
              <div className="form-control-plaintext">
                {mechanic.user ? `${mechanic.user.full_name} (${mechanic.user.email})` : '—'}
              </div>
            </div>
          ) : canListUsers ? (
            <SelectField
              label="Usuario"
              name="user_id"
              required
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              errors={errors}
              disabled={users.isPending}
              hint="Usuario del sistema con el que el mecánico inicia sesión."
            >
              <option value="">{users.isPending ? 'Cargando…' : 'Seleccione un usuario'}</option>
              {users.data?.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.first_name} ${user.last_name}`.trim()} — {user.email}
                </option>
              ))}
            </SelectField>
          ) : (
            <div className="alert alert-warning">Para elegir el usuario del mecánico hace falta el permiso de usuarios.</div>
          )}
        </div>
        <div className="col-md-6">
          <TextField
            label="Código de empleado"
            name="employee_code"
            required
            maxLength={50}
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Especialidad"
            name="specialty"
            maxLength={100}
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Fecha de ingreso"
            name="hire_date"
            type="date"
            value={hireDate}
            onChange={(event) => setHireDate(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Costo por hora (Gs.)"
            name="hour_cost"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={hourCost}
            onChange={(event) => setHourCost(event.target.value)}
            errors={errors}
            hint="Se copia a cada trabajo al cargar horas."
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Comisión (%)"
            name="commission_percentage"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.01"
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
            errors={errors}
            hint="Sobre el total sin IVA de sus trabajos."
          />
        </div>
        {mechanic && (
          <div className="col-md-6">
            <SelectField
              label="Estado"
              name="status"
              required
              value={status}
              onChange={(event) => setStatus(event.target.value as MechanicStatus)}
              errors={errors}
              hint="Solo los mecánicos activos reciben trabajos."
            >
              {Object.entries(MECHANIC_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
        )}
      </div>
      <TextareaField label="Notas" name="notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}
