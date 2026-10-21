import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { PART_STATUS, partsApi, useAllPartCategories, type Part } from '@/features/parts/api'
import { DeletePartDialog } from '@/features/parts/DeletePartDialog'
import { PartFormModal } from '@/features/parts/PartFormModal'
import { useAllSuppliers } from '@/features/suppliers/api'
import { formatMoney } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

export function PartsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [editing, setEditing] = useState<Part | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Part | null>(null)
  const categories = useAllPartCategories()
  const suppliers = useAllSuppliers({ enabled: can('suppliers.index') })

  const params = { ...list.params, category_id: categoryId, status, supplier_id: supplierId }
  const query = useQuery({
    queryKey: ['parts', params],
    queryFn: () => partsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filterSelect = (label: string, value: string, setter: (value: string) => void, options: [string | number, string][], all: string) => (
    <select
      className="form-select form-select-sm w-auto"
      aria-label={label}
      value={value}
      onChange={(event) => {
        setter(event.target.value)
        list.setPage(1)
      }}
    >
      <option value="">{all}</option>
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  )

  const columns: Column<Part>[] = [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (part) => <span className="text-secondary">{part.code}</span> },
    {
      key: 'name',
      header: 'Repuesto',
      render: (part) => (
        <>
          <div>{part.name}</div>
          <div className="small text-secondary">{[part.brand, part.sku && `SKU ${part.sku}`, part.part_number].filter(Boolean).join(' · ')}</div>
        </>
      ),
    },
    { key: 'category', header: 'Categoría', render: (part) => part.category?.name ?? '—' },
    { key: 'unit', header: 'Unidad', render: (part) => part.unit.label },
    { key: 'price', header: 'Precio (sin IVA)', className: 'text-end text-nowrap', render: (part) => formatMoney(part.sale_price) },
    { key: 'status', header: 'Estado', render: (part) => <StatusBadge value={part.status.value} map={PART_STATUS} /> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (part) => (
        <>
          {can('parts.update') && part.status.value !== 'discontinued' && (
            <IconButton label={`Editar ${part.name}`} icon={IconPencil} onClick={() => setEditing(part)} />
          )}
          {can('parts.destroy') && <IconButton label={`Eliminar ${part.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(part)} />}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Inventario"
        title="Repuestos"
        actions={
          can('parts.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo repuesto
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(part) => part.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          onRowClick={can('parts.show') ? (part) => navigate(`/parts/${part.id}`) : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Código, SKU, nº de parte, nombre o marca…' }}
          toolbar={
            <>
              {filterSelect(
                'Filtrar por categoría',
                categoryId,
                setCategoryId,
                (categories.data ?? []).map((category) => [category.id, category.name]),
                'Todas las categorías',
              )}
              {can('suppliers.index') &&
                filterSelect(
                  'Filtrar por proveedor',
                  supplierId,
                  setSupplierId,
                  (suppliers.data ?? []).map((supplier) => [supplier.id, supplier.name]),
                  'Todos los proveedores',
                )}
              {filterSelect(
                'Filtrar por estado',
                status,
                setStatus,
                Object.entries(PART_STATUS).map(([value, { label }]) => [value, label]),
                'Todos los estados',
              )}
            </>
          }
        />
      </PageBody>
      {editing && (
        <PartFormModal
          partId={editing === 'new' ? null : editing.id}
          onClose={() => setEditing(null)}
          onCreated={can('parts.show') ? (part) => navigate(`/parts/${part.id}`) : undefined}
        />
      )}
      {deleting && <DeletePartDialog part={deleting} onClose={() => setDeleting(null)} />}
    </>
  )
}
