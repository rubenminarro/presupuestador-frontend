import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  IconAdjustmentsHorizontal,
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowUpRight,
  IconBan,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconStarFilled,
  IconTrash,
  IconUnlink,
} from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SelectField, SwitchField, TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { InventoryOperationModal, type InventoryOperation } from '@/features/inventory/InventoryOperationModal'
import { MovementsTable } from '@/features/inventory/MovementsTable'
import { PART_STATUS, partsApi, type Part, type PartSupplierInput } from '@/features/parts/api'
import { DeletePartDialog } from '@/features/parts/DeletePartDialog'
import { PartFormModal } from '@/features/parts/PartFormModal'
import { useAllSuppliers, type Supplier } from '@/features/suppliers/api'
import { formatDateTime, formatMoney, formatQuantity } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

export function PartDetailPage() {
  const { id } = useParams()
  const partId = Number(id)

  const query = useQuery({
    queryKey: ['parts', 'detail', partId],
    queryFn: () => partsApi.show(partId),
    enabled: Number.isInteger(partId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Repuestos" title="Repuesto" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <PartDetail part={query.data} />
}

function PartDetail({ part }: { part: Part }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [discontinuing, setDiscontinuing] = useState(false)
  const [operation, setOperation] = useState<InventoryOperation | null>(null)
  const status = part.status.value
  const discontinued = status === 'discontinued'

  const changeStatus = useApiMutation(
    (action: 'activate' | 'deactivate' | 'discontinue') => partsApi[action](part.id),
    {
      invalidate: [['parts'], ['inventory']],
      successMessage: 'Estado del repuesto actualizado.',
      onSuccess: () => setDiscontinuing(false),
    },
  )

  return (
    <>
      <PageHeader
        pretitle={`Repuesto ${part.code}`}
        title={part.name}
        actions={
          <>
            <Link to="/parts" className="btn btn-link">
              <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
              Repuestos
            </Link>
            {can('parts.update') && !discontinued && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setEditing(true)}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar
              </button>
            )}
            {can('parts.change-status') && !discontinued && (
              <>
                {status === 'active' ? (
                  <button
                    type="button"
                    className="btn btn-outline-warning"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate('deactivate')}
                  >
                    <IconPlayerPause size={18} className="me-1" aria-hidden="true" />
                    Desactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate('activate')}
                  >
                    <IconPlayerPlay size={18} className="me-1" aria-hidden="true" />
                    Activar
                  </button>
                )}
                <button type="button" className="btn btn-outline-danger" onClick={() => setDiscontinuing(true)}>
                  <IconBan size={18} className="me-1" aria-hidden="true" />
                  Descontinuar
                </button>
              </>
            )}
            {can('parts.destroy') && (
              <button type="button" className="btn btn-outline-danger" onClick={() => setDeleting(true)}>
                <IconTrash size={18} className="me-1" aria-hidden="true" />
                Eliminar
              </button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="row row-cards">
          <div className="col-12 col-lg-5">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Datos del repuesto</h3>
                <div className="card-actions">
                  <StatusBadge value={status} map={PART_STATUS} />
                </div>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-5">Categoría</dt>
                  <dd className="col-7">{part.category?.name ?? '—'}</dd>
                  <dt className="col-5">Marca</dt>
                  <dd className="col-7">{part.brand ?? '—'}</dd>
                  <dt className="col-5">SKU</dt>
                  <dd className="col-7">{part.sku ?? '—'}</dd>
                  <dt className="col-5">Número de parte</dt>
                  <dd className="col-7">{part.part_number ?? '—'}</dd>
                  <dt className="col-5">Unidad</dt>
                  <dd className="col-7">{part.unit.label}</dd>
                  <dt className="col-5">Precio de venta</dt>
                  <dd className="col-7">{formatMoney(part.sale_price)} (sin IVA)</dd>
                  <dt className="col-5">Costo de referencia</dt>
                  <dd className="col-7">{formatMoney(part.cost_price)} (sin IVA)</dd>
                  <dt className="col-5">Stock mínimo</dt>
                  <dd className="col-7">{formatQuantity(part.minimum_stock)}</dd>
                  {part.description && (
                    <>
                      <dt className="col-12">Descripción</dt>
                      <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                        {part.description}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-7">
            <StockCard part={part} onOperation={setOperation} />
          </div>
          <div className="col-12">
            <PartSuppliersTable part={part} />
          </div>
          {can('inventory.show') && (
            <div className="col-12">
              <MovementsTable partId={part.id} title="Movimientos" />
            </div>
          )}
        </div>
      </PageBody>

      {editing && <PartFormModal partId={part.id} onClose={() => setEditing(false)} />}
      {deleting && <DeletePartDialog part={part} onClose={() => setDeleting(false)} onDeleted={() => navigate('/parts', { replace: true })} />}
      <ConfirmDialog
        open={discontinuing}
        title="Descontinuar repuesto"
        message={
          <>
            ¿Descontinuar <strong>{part.name}</strong>? Es definitivo: ya no podrá editarse, reactivarse ni recibir entradas de stock.
          </>
        }
        confirmLabel="Descontinuar"
        variant="danger"
        isLoading={changeStatus.isPending}
        onConfirm={() => changeStatus.mutate('discontinue')}
        onClose={() => setDiscontinuing(false)}
      />
      {operation && part.stock && (
        <InventoryOperationModal
          operation={operation}
          part={part}
          stock={{ on_hand: part.stock.on_hand, available: part.stock.available }}
          onClose={() => setOperation(null)}
        />
      )}
    </>
  )
}

function StockCard({ part, onOperation }: { part: Part; onOperation: (operation: InventoryOperation) => void }) {
  const { can } = useAuth()
  const stock = part.stock

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Stock</h3>
        {stock?.is_below_minimum && <span className="badge bg-red-lt ms-2">Bajo mínimo</span>}
        {stock && (
          <div className="card-actions btn-list">
            {can('inventory.entry') && part.status.value !== 'discontinued' && (
              <button type="button" className="btn btn-sm btn-outline-success" onClick={() => onOperation('entry')}>
                <IconArrowDownRight size={16} className="me-1" aria-hidden="true" />
                Stock inicial
              </button>
            )}
            {can('inventory.exit') && (
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => onOperation('exit')}>
                <IconArrowUpRight size={16} className="me-1" aria-hidden="true" />
                Salida
              </button>
            )}
            {can('inventory.adjust') && (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onOperation('adjust')}>
                <IconAdjustmentsHorizontal size={16} className="me-1" aria-hidden="true" />
                Ajuste
              </button>
            )}
          </div>
        )}
      </div>
      <div className="card-body">
        {!stock ? (
          <div className="text-secondary">El repuesto no tiene registro de stock.</div>
        ) : (
          <>
            <div className="row g-3 mb-3">
              {(
                [
                  ['En stock', stock.on_hand],
                  ['Reservado', stock.reserved],
                  ['Disponible', stock.available],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="col-4">
                  <div className="text-secondary small">{label}</div>
                  <div className="h2 mb-0">{formatQuantity(value)}</div>
                </div>
              ))}
            </div>
            <dl className="row mb-0">
              <dt className="col-5">Costo promedio</dt>
              <dd className="col-7">{formatMoney(stock.average_cost)} (sin IVA)</dd>
              <dt className="col-5">Último movimiento</dt>
              <dd className="col-7">{formatDateTime(stock.last_movement_at)}</dd>
            </dl>
          </>
        )}
      </div>
    </div>
  )
}

function PartSuppliersTable({ part }: { part: Part }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const [detaching, setDetaching] = useState<Supplier | null>(null)
  const canManage = can('parts.manage-suppliers')
  const discontinued = part.status.value === 'discontinued'
  const suppliers = part.suppliers ?? []

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Proveedor',
      render: (supplier) => (
        <>
          {supplier.pivot?.is_preferred && <IconStarFilled size={14} className="text-yellow me-1" aria-label="Preferido" />}
          {supplier.name}
          {!supplier.is_active && <span className="badge bg-secondary-lt ms-2">Inactivo</span>}
          <div className="small text-secondary">{[supplier.phone, supplier.email].filter(Boolean).join(' · ')}</div>
        </>
      ),
    },
    { key: 'code', header: 'Código del proveedor', render: (supplier) => supplier.pivot?.supplier_part_code ?? '—' },
    {
      key: 'last_cost',
      header: 'Último costo (sin IVA)',
      className: 'text-end text-nowrap',
      render: (supplier) => formatMoney(supplier.pivot?.last_cost),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (supplier) =>
        canManage && (
          <>
            {!discontinued && <IconButton label={`Editar ${supplier.name}`} icon={IconPencil} onClick={() => setEditing(supplier)} />}
            <IconButton label={`Desvincular ${supplier.name}`} icon={IconUnlink} variant="danger" onClick={() => setDetaching(supplier)} />
          </>
        ),
    },
  ]

  return (
    <>
      <DataTable
        title="Proveedores"
        columns={columns}
        rows={suppliers}
        rowKey={(supplier) => supplier.id}
        emptyMessage="El repuesto no tiene proveedores vinculados."
        toolbar={
          canManage &&
          !discontinued && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Vincular proveedor
            </button>
          )
        }
      />
      {editing && (
        <PartSupplierFormModal
          part={part}
          supplier={editing === 'new' ? null : editing}
          linkedIds={suppliers.map((supplier) => supplier.id)}
          onClose={() => setEditing(null)}
        />
      )}
      {detaching && (
        <DeleteDialog
          title="Desvincular proveedor"
          message={
            <>
              ¿Desvincular a <strong>{detaching.name}</strong> de este repuesto? Se pierde su código y último costo.
            </>
          }
          onDelete={() => partsApi.detachSupplier(part.id, detaching.id)}
          invalidate={[['parts'], ['suppliers']]}
          successMessage="Proveedor desvinculado."
          onClose={() => setDetaching(null)}
        />
      )}
    </>
  )
}

interface PartSupplierFormModalProps {
  part: Part
  /** null: vincular uno nuevo. */
  supplier: Supplier | null
  linkedIds: number[]
  onClose: () => void
}

function PartSupplierFormModal({ part, supplier, linkedIds, onClose }: PartSupplierFormModalProps) {
  const allSuppliers = useAllSuppliers({ active: true, enabled: supplier === null })
  const [supplierId, setSupplierId] = useState('')
  const [code, setCode] = useState(supplier?.pivot?.supplier_part_code ?? '')
  const [lastCost, setLastCost] = useState(toInput(supplier?.pivot?.last_cost))
  const [isPreferred, setIsPreferred] = useState(supplier?.pivot?.is_preferred ?? false)
  const options = (allSuppliers.data ?? []).filter((option) => !linkedIds.includes(option.id))

  const mutation = useApiMutation(
    () => {
      const body: PartSupplierInput = {
        supplier_part_code: nullIfEmpty(code),
        last_cost: toNumber(lastCost),
        is_preferred: isPreferred,
      }
      // Código y costo vacíos van en null: al editar se vacían.
      return supplier
        ? partsApi.updateSupplier(part.id, supplier.id, body)
        : partsApi.attachSupplier(part.id, { ...body, supplier_id: toNumber(supplierId) })
    },
    {
      invalidate: [['parts'], ['suppliers']],
      successMessage: supplier ? 'Proveedor del repuesto actualizado.' : 'Proveedor vinculado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={supplier ? `Proveedor ${supplier.name}` : 'Vincular proveedor'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
    >
      {!supplier && (
        <SelectField
          label="Proveedor"
          name="supplier_id"
          required
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          errors={errors}
          hint="Solo proveedores activos que todavía no están vinculados."
        >
          <option value="">Seleccione un proveedor</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </SelectField>
      )}
      <TextField
        label="Código del proveedor"
        name="supplier_part_code"
        maxLength={100}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        errors={errors}
        hint="Letras, números, - y _."
      />
      <TextField
        label="Último costo (sin IVA)"
        name="last_cost"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={lastCost}
        onChange={(event) => setLastCost(event.target.value)}
        errors={errors}
        hint="Opcional; las compras recibidas lo actualizan."
      />
      <SwitchField
        label="Proveedor preferido"
        name="is_preferred"
        checked={isPreferred}
        onChange={setIsPreferred}
        errors={errors}
        hint="Solo uno por repuesto: marcarlo quita la marca al anterior."
      />
    </FormModal>
  )
}
