import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/useAuth'
import { suppliersApi, type Supplier, type SupplierInput } from '@/features/suppliers/api'
import { nullIfEmpty } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { useListParams } from '@/lib/useListParams'
import { validationErrors } from '@/services/api'

export function SuppliersPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [active, setActive] = useState('')
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Supplier | null>(null)

  const params = { ...list.params, is_active: active }
  const query = useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => suppliersApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Proveedor',
      render: (supplier) => (
        <>
          <div>{supplier.name}</div>
          {supplier.tax_id && <div className="small text-secondary">RUC {supplier.tax_id}</div>}
        </>
      ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (supplier) => (
        <>
          <div>{supplier.contact_name ?? '—'}</div>
          <div className="small text-secondary">{[supplier.phone, supplier.email].filter(Boolean).join(' · ')}</div>
        </>
      ),
    },
    { key: 'parts', header: 'Repuestos', className: 'text-end', render: (supplier) => supplier.parts_count ?? '—' },
    {
      key: 'status',
      header: 'Estado',
      render: (supplier) =>
        supplier.is_active ? <span className="badge bg-green-lt">Activo</span> : <span className="badge bg-secondary-lt">Inactivo</span>,
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (supplier) => (
        <>
          {can('suppliers.update') && <IconButton label={`Editar ${supplier.name}`} icon={IconPencil} onClick={() => setEditing(supplier)} />}
          {can('suppliers.destroy') && (
            <IconButton label={`Eliminar ${supplier.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(supplier)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Inventario"
        title="Proveedores"
        actions={
          can('suppliers.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo proveedor
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(supplier) => supplier.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Nombre, RUC, contacto, teléfono o email…' }}
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
      </PageBody>
      {editing && <SupplierFormModal supplierId={editing === 'new' ? null : editing.id} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar proveedor"
          message={
            <>
              ¿Eliminar a <strong>{deleting.name}</strong>? Si tiene repuestos vinculados no se puede: desvincúlelos o márquelo como
              inactivo.
            </>
          }
          onDelete={() => suppliersApi.remove(deleting.id)}
          invalidate={[['suppliers']]}
          successMessage="Proveedor eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

/** La edición pide el detalle porque el listado no trae dirección ni notas. */
function SupplierFormModal({ supplierId, onClose }: { supplierId: number | null; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['suppliers', 'detail', supplierId],
    queryFn: () => suppliersApi.show(supplierId as number),
    enabled: supplierId !== null,
  })

  if (supplierId !== null && !detail.data) {
    return (
      <FormModal title="Editar proveedor" onClose={onClose} onSubmit={() => undefined} isSubmitting>
        {detail.error ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : <LoadingState />}
      </FormModal>
    )
  }

  return <SupplierForm supplier={detail.data ?? null} onClose={onClose} />
}

function SupplierForm({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const [name, setName] = useState(supplier?.name ?? '')
  const [taxId, setTaxId] = useState(supplier?.tax_id ?? '')
  const [contactName, setContactName] = useState(supplier?.contact_name ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [address, setAddress] = useState(supplier?.address ?? '')
  const [notes, setNotes] = useState(supplier?.notes ?? '')
  const [isActive, setIsActive] = useState(supplier?.is_active ?? true)

  const mutation = useApiMutation(
    () => {
      const body: SupplierInput = {
        name: name.trim(),
        tax_id: nullIfEmpty(taxId),
        contact_name: nullIfEmpty(contactName),
        phone: nullIfEmpty(phone),
        email: nullIfEmpty(email),
        address: nullIfEmpty(address),
        notes: nullIfEmpty(notes),
        is_active: isActive,
      }
      // Los opcionales vacíos van en null: al editar se vacían.
      return supplier ? suppliersApi.update(supplier.id, body) : suppliersApi.create(body)
    },
    {
      invalidate: [['suppliers']],
      successMessage: supplier ? 'Proveedor actualizado.' : 'Proveedor creado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        <div className="col-md-8">
          <TextField
            label="Razón social / nombre"
            name="name"
            required
            autoFocus
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <TextField label="RUC" name="tax_id" maxLength={30} value={taxId} onChange={(event) => setTaxId(event.target.value)} errors={errors} />
        </div>
        <div className="col-md-4">
          <TextField
            label="Contacto"
            name="contact_name"
            maxLength={150}
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="Teléfono"
            name="phone"
            type="tel"
            maxLength={30}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="Email"
            name="email"
            type="email"
            maxLength={150}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            errors={errors}
          />
        </div>
      </div>
      <TextField label="Dirección" name="address" maxLength={255} value={address} onChange={(event) => setAddress(event.target.value)} errors={errors} />
      <TextareaField label="Notas" name="notes" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
      <SwitchField
        label="Activo"
        name="is_active"
        checked={isActive}
        onChange={setIsActive}
        errors={errors}
        hint="Los inactivos no se pueden vincular a repuestos ni usar en compras."
      />
    </FormModal>
  )
}
