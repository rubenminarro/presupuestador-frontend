import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlayerPause, IconPlayerPlay, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { SERVICE_STATUS, servicesApi, useServiceCategories, type Service, type ServiceInput } from '@/features/services/api'
import { formatDecimal, formatMoney } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

export function ServicesPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const categories = useServiceCategories()

  const params = { ...list.params, category_id: categoryId, status }
  const query = useQuery({
    queryKey: ['services', params],
    queryFn: () => servicesApi.list(params),
    placeholderData: keepPreviousData,
  })

  const toggleStatus = useApiMutation(
    (service: Service) => (service.status.value === 'active' ? servicesApi.deactivate(service.id) : servicesApi.activate(service.id)),
    { invalidate: [['services']], successMessage: 'Estado del servicio actualizado.' },
  )

  const columns: Column<Service>[] = [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (service) => <span className="text-secondary">{service.code}</span> },
    { key: 'name', header: 'Servicio', render: (service) => service.name },
    { key: 'category', header: 'Categoría', render: (service) => service.category?.name ?? '—' },
    {
      key: 'price',
      header: 'Precio (sin IVA)',
      className: 'text-end text-nowrap',
      render: (service) => formatMoney(service.standard_price),
    },
    {
      key: 'hours',
      header: 'Horas est.',
      className: 'text-end',
      render: (service) => (service.estimated_hours === null ? '—' : formatDecimal(service.estimated_hours)),
    },
    { key: 'status', header: 'Estado', render: (service) => <StatusBadge value={service.status.value} map={SERVICE_STATUS} /> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (service) => (
        <>
          {can('services.update') && <IconButton label={`Editar ${service.name}`} icon={IconPencil} onClick={() => setEditing(service)} />}
          {can('services.change-status') && (
            <IconButton
              label={service.status.value === 'active' ? `Desactivar ${service.name}` : `Activar ${service.name}`}
              icon={service.status.value === 'active' ? IconPlayerPause : IconPlayerPlay}
              variant={service.status.value === 'active' ? 'warning' : 'success'}
              disabled={toggleStatus.isPending}
              onClick={() => toggleStatus.mutate(service)}
            />
          )}
          {can('services.destroy') && (
            <IconButton label={`Eliminar ${service.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(service)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Servicios"
        actions={
          can('services.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo servicio
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(service) => service.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar por código o nombre…' }}
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
                {Object.entries(SERVICE_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          }
        />
      </PageBody>
      {editing && <ServiceFormModal serviceId={editing === 'new' ? null : editing.id} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar servicio"
          message={
            <>
              ¿Eliminar <strong>{deleting.name}</strong>? Si ya se usó en presupuestos o lo usa un plan de mantenimiento no se
              puede eliminar: desactívelo.
            </>
          }
          onDelete={() => servicesApi.remove(deleting.id)}
          invalidate={[['services']]}
          successMessage="Servicio eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

/** La edición pide el detalle porque el listado no trae la descripción. */
function ServiceFormModal({ serviceId, onClose }: { serviceId: number | null; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['services', 'detail', serviceId],
    queryFn: () => servicesApi.show(serviceId as number),
    enabled: serviceId !== null,
  })

  if (serviceId !== null && !detail.data) {
    return (
      <FormModal title="Editar servicio" onClose={onClose} onSubmit={() => undefined} isSubmitting>
        {detail.error ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : <LoadingState />}
      </FormModal>
    )
  }

  return <ServiceForm service={detail.data ?? null} onClose={onClose} />
}

function ServiceForm({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const categories = useServiceCategories()
  const [categoryId, setCategoryId] = useState(toInput(service?.service_category_id))
  const [name, setName] = useState(service?.name ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [price, setPrice] = useState(toInput(service?.standard_price))
  const [hours, setHours] = useState(toInput(service?.estimated_hours))

  const mutation = useApiMutation(
    () => {
      // Descripción y horas vacías se borran (ambas nullable); los obligatorios vacíos dan 422 en su campo.
      const body: ServiceInput = {
        service_category_id: toNumber(categoryId),
        name: name.trim(),
        description: nullIfEmpty(description),
        standard_price: toNumber(price),
        estimated_hours: toNumber(hours),
      }
      return service ? servicesApi.update(service.id, body) : servicesApi.create(body)
    },
    {
      invalidate: [['services'], ['service-categories']],
      successMessage: service ? 'Servicio actualizado.' : 'Servicio creado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={service ? `Editar servicio ${service.code}` : 'Nuevo servicio'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        <div className="col-md-6">
          <SelectField
            label="Categoría"
            name="service_category_id"
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            errors={errors}
          >
            <option value="">Seleccione una categoría</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-6">
          <TextField
            label="Nombre"
            name="name"
            required
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            errors={errors}
            hint={service ? 'Si ya se usó en presupuestos, el nombre no se puede cambiar.' : undefined}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Precio estándar (sin IVA)"
            name="standard_price"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            errors={errors}
            hint="En guaraníes, sin IVA; hasta 2 decimales."
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Horas estimadas"
            name="estimated_hours"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            errors={errors}
            hint="Opcional. Se usa para calcular las horas del presupuesto."
          />
        </div>
      </div>
      <TextareaField
        label="Descripción"
        name="description"
        rows={3}
        maxLength={1000}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        errors={errors}
      />
    </FormModal>
  )
}
