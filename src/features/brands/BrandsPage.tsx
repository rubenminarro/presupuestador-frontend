import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, TextField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { brandsApi, useAllBrands, vehicleModelsApi, type Brand, type VehicleModel } from '@/features/brands/api'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

export function BrandsPage() {
  const { can } = useAuth()

  return (
    <>
      <PageHeader pretitle="Configuración" title="Marcas y modelos" />
      <PageBody>
        <div className="row row-cards">
          {can('brands.index') && (
            <div className="col-12 col-xl-5">
              <BrandsTable />
            </div>
          )}
          {can('vehicle_models.index') && (
            <div className="col-12 col-xl-7">
              <VehicleModelsTable />
            </div>
          )}
        </div>
      </PageBody>
    </>
  )
}

function BrandsTable() {
  const { can } = useAuth()
  const list = useListParams()
  const [editing, setEditing] = useState<Brand | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Brand | null>(null)

  const query = useQuery({
    queryKey: ['brands', list.params],
    queryFn: () => brandsApi.list(list.params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<Brand>[] = [
    { key: 'name', header: 'Marca', render: (brand) => brand.name },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (brand) => (
        <>
          {can('brands.update') && <IconButton label={`Editar ${brand.name}`} icon={IconPencil} onClick={() => setEditing(brand)} />}
          {can('brands.destroy') && (
            <IconButton label={`Eliminar ${brand.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(brand)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <DataTable
        title="Marcas"
        columns={columns}
        rows={query.data?.items}
        rowKey={(brand) => brand.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        pagination={query.data?.pagination}
        onPageChange={list.setPage}
        search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar marca…' }}
        toolbar={
          can('brands.store') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Nueva marca
            </button>
          )
        }
      />
      {editing && <BrandFormModal brand={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar marca"
          message={
            <>
              ¿Eliminar la marca <strong>{deleting.name}</strong>? Solo se puede si no tiene modelos ni vehículos registrados.
            </>
          }
          onDelete={() => brandsApi.remove(deleting.id)}
          invalidate={[['brands'], ['vehicle-models']]}
          successMessage="Marca eliminada."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function BrandFormModal({ brand, onClose }: { brand: Brand | null; onClose: () => void }) {
  const [name, setName] = useState(brand?.name ?? '')

  const mutation = useApiMutation(() => (brand ? brandsApi.update(brand.id, { name }) : brandsApi.create({ name })), {
    invalidate: [['brands'], ['vehicle-models']],
    successMessage: brand ? 'Marca actualizada.' : 'Marca creada.',
    onSuccess: onClose,
  })

  return (
    <FormModal
      title={brand ? 'Editar marca' : 'Nueva marca'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="sm"
    >
      <TextField
        label="Nombre"
        name="name"
        required
        autoFocus
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
        errors={validationErrors(mutation.error)}
        hint="Solo letras y espacios."
      />
    </FormModal>
  )
}

function VehicleModelsTable() {
  const { can } = useAuth()
  const list = useListParams()
  const [editing, setEditing] = useState<VehicleModel | 'new' | null>(null)
  const [deleting, setDeleting] = useState<VehicleModel | null>(null)

  const query = useQuery({
    queryKey: ['vehicle-models', list.params],
    queryFn: () => vehicleModelsApi.list(list.params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<VehicleModel>[] = [
    { key: 'name', header: 'Modelo', render: (model) => model.name },
    { key: 'brand', header: 'Marca', render: (model) => model.brand?.name ?? '—' },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (model) => (
        <>
          {can('vehicle_models.update') && (
            <IconButton label={`Editar ${model.name}`} icon={IconPencil} onClick={() => setEditing(model)} />
          )}
          {can('vehicle_models.destroy') && (
            <IconButton label={`Eliminar ${model.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(model)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <DataTable
        title="Modelos"
        columns={columns}
        rows={query.data?.items}
        rowKey={(model) => model.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        pagination={query.data?.pagination}
        onPageChange={list.setPage}
        search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Buscar modelo o marca…' }}
        toolbar={
          can('vehicle_models.store') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Nuevo modelo
            </button>
          )
        }
      />
      {editing && <VehicleModelFormModal model={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar modelo"
          message={
            <>
              ¿Eliminar el modelo <strong>{deleting.name}</strong>? Solo se puede si no tiene vehículos registrados.
            </>
          }
          onDelete={() => vehicleModelsApi.remove(deleting.id)}
          invalidate={[['vehicle-models']]}
          successMessage="Modelo eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function VehicleModelFormModal({ model, onClose }: { model: VehicleModel | null; onClose: () => void }) {
  const [name, setName] = useState(model?.name ?? '')
  const [brandId, setBrandId] = useState(model?.brand ? String(model.brand.id) : '')
  const brands = useAllBrands()

  const mutation = useApiMutation(
    () => {
      const body = { name, brand_id: Number(brandId) }
      return model ? vehicleModelsApi.update(model.id, body) : vehicleModelsApi.create(body)
    },
    {
      invalidate: [['vehicle-models']],
      successMessage: model ? 'Modelo actualizado.' : 'Modelo creado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={model ? 'Editar modelo' : 'Nuevo modelo'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="sm"
    >
      <SelectField
        label="Marca"
        name="brand_id"
        required
        value={brandId}
        onChange={(event) => setBrandId(event.target.value)}
        errors={errors}
        disabled={brands.isPending}
      >
        <option value="">{brands.isPending ? 'Cargando…' : 'Seleccione una marca'}</option>
        {brands.data?.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Nombre"
        name="name"
        required
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
        errors={errors}
        hint="Letras, números, espacios y guiones."
      />
    </FormModal>
  )
}
