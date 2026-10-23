import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { intervalLabel, maintenanceApi, type MaintenancePlan } from '@/features/maintenance/api'
import { servicesApi } from '@/features/services/api'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

/** Planes de mantenimiento preventivo (alta, edición y baja: administrador). Un plan con seguimiento no se elimina. */
export function MaintenancePlansPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [active, setActive] = useState('')
  const [editing, setEditing] = useState<MaintenancePlan | 'new' | null>(null)
  const [deleting, setDeleting] = useState<MaintenancePlan | null>(null)

  const params = { search: list.params.search, is_active: active }
  const query = useQuery({ queryKey: ['maintenance-plans', params], queryFn: () => maintenanceApi.plans(params) })

  const columns: Column<MaintenancePlan>[] = [
    {
      key: 'name',
      header: 'Plan',
      render: (plan) => (
        <>
          <div>{plan.name}</div>
          {plan.description && <div className="small text-secondary">{plan.description}</div>}
        </>
      ),
    },
    { key: 'interval', header: 'Intervalo', render: (plan) => intervalLabel(plan.interval_km, plan.interval_days) },
    {
      key: 'service',
      header: 'Servicio que lo registra',
      render: (plan) => (plan.service ? `${plan.service.code} · ${plan.service.name}` : <span className="text-secondary">Solo manual</span>),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (plan) => <span className={`badge ${plan.is_active ? 'bg-green-lt' : 'bg-secondary-lt'}`}>{plan.is_active ? 'Activo' : 'Inactivo'}</span>,
    },
    ...(can('maintenance-plans.update') || can('maintenance-plans.destroy')
      ? [
          {
            key: 'actions',
            header: <span className="visually-hidden">Acciones</span>,
            className: 'w-1 text-nowrap',
            render: (plan: MaintenancePlan) => (
              <>
                {can('maintenance-plans.update') && <IconButton label={`Editar ${plan.name}`} icon={IconPencil} onClick={() => setEditing(plan)} />}
                {can('maintenance-plans.destroy') && (
                  <IconButton label={`Eliminar ${plan.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(plan)} />
                )}
              </>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Planes de mantenimiento"
        actions={
          can('maintenance-plans.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo plan
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data}
          rowKey={(plan) => plan.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          emptyMessage="No hay planes de mantenimiento."
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Nombre del plan…' }}
          toolbar={
            <select className="form-select form-select-sm w-auto" aria-label="Filtrar por estado" value={active} onChange={(event) => setActive(event.target.value)}>
              <option value="">Todos</option>
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
            </select>
          }
        />
        <div className="small text-secondary mt-2">
          Vence por km o por días, lo que ocurra primero. Con servicio asociado, completar una OT con ese servicio registra el
          mantenimiento del vehículo.
        </div>
      </PageBody>
      {editing && <PlanFormModal plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar plan"
          message={
            <>
              ¿Eliminar <strong>{deleting.name}</strong>? Si algún vehículo ya tiene seguimiento, no se puede: desactívelo.
            </>
          }
          onDelete={() => maintenanceApi.removePlan(deleting.id)}
          invalidate={[['maintenance-plans']]}
          successMessage="Plan eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function PlanFormModal({ plan, onClose }: { plan: MaintenancePlan | null; onClose: () => void }) {
  const { can } = useAuth()
  const services = useQuery({
    queryKey: ['services', 'all-active'],
    queryFn: async () => (await servicesApi.list({ per_page: 1000, status: 'active' })).items,
    enabled: can('services.index'),
    staleTime: 5 * 60_000,
  })
  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [serviceId, setServiceId] = useState(toInput(plan?.service_id))
  const [intervalKm, setIntervalKm] = useState(toInput(plan?.interval_km))
  const [intervalDays, setIntervalDays] = useState(toInput(plan?.interval_days))
  const [isActive, setIsActive] = useState(plan?.is_active ?? true)
  // Se conserva el servicio actual aunque ya no esté activo.
  const options = [...(services.data ?? []).map((service) => ({ id: service.id, code: service.code, name: service.name }))]
  if (plan?.service && !options.some((service) => service.id === plan.service?.id)) options.unshift(plan.service)

  const mutation = useApiMutation(
    () => {
      const body = {
        name: name.trim(),
        description: nullIfEmpty(description),
        // Sin cambios no se manda: el backend rechaza un servicio eliminado aunque sea el que ya tenía.
        ...((!plan || serviceId !== toInput(plan.service_id)) && { service_id: toNumber(serviceId) }),
        interval_km: toNumber(intervalKm),
        interval_days: toNumber(intervalDays),
        is_active: isActive,
      }
      return plan ? maintenanceApi.updatePlan(plan.id, body) : maintenanceApi.createPlan(body)
    },
    // Cambiar intervalos recalcula los vencimientos de los vehículos.
    { invalidate: [['maintenance-plans'], ['vehicle-maintenances'], ['maintenance-alerts']], successMessage: plan ? 'Plan actualizado.' : 'Plan creado.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={plan ? `Editar · ${plan.name}` : 'Nuevo plan'} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      <TextField label="Nombre" name="name" required maxLength={100} autoFocus value={name} onChange={(event) => setName(event.target.value)} errors={errors} />
      <TextareaField
        label="Descripción"
        name="description"
        rows={2}
        maxLength={1000}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        errors={errors}
      />
      <div className="row">
        <div className="col-6">
          <TextField
            label="Cada (km)"
            name="interval_km"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={intervalKm}
            onChange={(event) => setIntervalKm(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-6">
          <TextField
            label="Cada (días)"
            name="interval_days"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={intervalDays}
            onChange={(event) => setIntervalDays(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-12 small text-secondary mb-3 mt-n2">Al menos uno de los dos; vence con el primero que se cumpla.</div>
      </div>
      <SelectField
        label="Servicio que lo registra"
        name="service_id"
        value={serviceId}
        onChange={(event) => setServiceId(event.target.value)}
        errors={errors}
        hint="Opcional: al completar una OT con este servicio, se registra el mantenimiento del vehículo."
      >
        <option value="">Ninguno (solo registro manual)</option>
        {options.map((service) => (
          <option key={service.id} value={service.id}>
            {service.code} · {service.name}
          </option>
        ))}
      </SelectField>
      <SwitchField label="Activo" name="is_active" checked={isActive} onChange={setIsActive} errors={errors} hint="Un plan inactivo no genera alertas." />
    </FormModal>
  )
}
