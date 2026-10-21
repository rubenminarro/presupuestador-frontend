import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconAdjustmentsHorizontal, IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { useAuth } from '@/features/auth/useAuth'
import { inventoryApi, type PartStock } from '@/features/inventory/api'
import { InventoryOperationModal, type InventoryOperation } from '@/features/inventory/InventoryOperationModal'
import { MovementsTable } from '@/features/inventory/MovementsTable'
import { PART_STATUS, useAllPartCategories } from '@/features/parts/api'
import { cx } from '@/lib/cx'
import { formatMoney, formatQuantity } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

type Tab = 'stock' | 'movements'

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>('stock')

  return (
    <>
      <PageHeader pretitle="Inventario" title="Stock y movimientos" />
      <PageBody>
        <ul className="nav nav-tabs mb-3" role="tablist">
          {(
            [
              ['stock', 'Stock'],
              ['movements', 'Movimientos'],
            ] as const
          ).map(([value, label]) => (
            <li key={value} className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={cx('nav-link', tab === value && 'active')}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        {tab === 'stock' ? <StockTable /> : <MovementsTable />}
      </PageBody>
    </>
  )
}

function StockTable() {
  const { can } = useAuth()
  const list = useListParams()
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [belowMinimum, setBelowMinimum] = useState(false)
  const [withStock, setWithStock] = useState(false)
  const [operation, setOperation] = useState<{ type: InventoryOperation; stock: PartStock } | null>(null)
  const categories = useAllPartCategories()

  const params = {
    ...list.params,
    category_id: categoryId,
    status,
    below_minimum: belowMinimum ? 1 : undefined,
    with_stock: withStock ? 1 : undefined,
  }
  const query = useQuery({
    queryKey: ['inventory', 'stocks', params],
    queryFn: () => inventoryApi.stocks(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<PartStock>[] = [
    {
      key: 'part',
      header: 'Repuesto',
      render: (stock) => (
        <>
          {can('parts.show') ? <Link to={`/parts/${stock.part.id}`}>{stock.part.name}</Link> : stock.part.name}
          <div className="small text-secondary">
            {stock.part.code}
            {stock.part.category && ` · ${stock.part.category.name}`}
            {stock.part.status.value !== 'active' && ` · ${PART_STATUS[stock.part.status.value].label}`}
          </div>
        </>
      ),
    },
    { key: 'unit', header: 'Unidad', render: (stock) => stock.part.unit.label },
    { key: 'on_hand', header: 'En stock', className: 'text-end', render: (stock) => formatQuantity(stock.quantity_on_hand) },
    { key: 'reserved', header: 'Reservado', className: 'text-end', render: (stock) => formatQuantity(stock.quantity_reserved) },
    {
      key: 'available',
      header: 'Disponible',
      className: 'text-end text-nowrap',
      render: (stock) => (
        <>
          {stock.is_below_minimum && <span className="badge bg-red-lt me-2">Bajo mínimo</span>}
          {formatQuantity(stock.quantity_available)}
        </>
      ),
    },
    { key: 'minimum', header: 'Mínimo', className: 'text-end', render: (stock) => formatQuantity(stock.part.minimum_stock) },
    { key: 'average_cost', header: 'Costo prom. (sin IVA)', className: 'text-end text-nowrap', render: (stock) => formatMoney(stock.average_cost) },
    { key: 'value', header: 'Valorizado', className: 'text-end text-nowrap', render: (stock) => formatMoney(stock.stock_value) },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (stock) => <StockActions stock={stock} onSelect={(type) => setOperation({ type, stock })} />,
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(stock) => stock.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        pagination={query.data?.pagination}
        onPageChange={list.setPage}
        search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Código, SKU, nº de parte, nombre o marca…' }}
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
              aria-label="Filtrar por estado del repuesto"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                list.setPage(1)
              }}
            >
              <option value="">Todos los estados</option>
              {Object.entries(PART_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="form-check form-check-inline mb-0 align-self-center">
              <input
                type="checkbox"
                className="form-check-input"
                checked={belowMinimum}
                onChange={(event) => {
                  setBelowMinimum(event.target.checked)
                  list.setPage(1)
                }}
              />
              <span className="form-check-label">Bajo mínimo</span>
            </label>
            <label className="form-check form-check-inline mb-0 align-self-center">
              <input
                type="checkbox"
                className="form-check-input"
                checked={withStock}
                onChange={(event) => {
                  setWithStock(event.target.checked)
                  list.setPage(1)
                }}
              />
              <span className="form-check-label">Con existencia</span>
            </label>
          </>
        }
      />
      {operation && (
        <InventoryOperationModal
          operation={operation.type}
          part={operation.stock.part}
          stock={{ on_hand: operation.stock.quantity_on_hand, available: operation.stock.quantity_available }}
          onClose={() => setOperation(null)}
        />
      )}
    </>
  )
}

/** Botones de stock inicial, salida y ajuste según permiso. Descontinuado: sin entradas (lo valida el backend). */
function StockActions({ stock, onSelect }: { stock: PartStock; onSelect: (type: InventoryOperation) => void }) {
  const { can } = useAuth()
  const name = stock.part.name

  return (
    <>
      {can('inventory.entry') && stock.part.status.value !== 'discontinued' && (
        <IconButton label={`Stock inicial de ${name}`} icon={IconArrowDownRight} variant="success" onClick={() => onSelect('entry')} />
      )}
      {can('inventory.exit') && (
        <IconButton label={`Salida de ${name}`} icon={IconArrowUpRight} variant="warning" onClick={() => onSelect('exit')} />
      )}
      {can('inventory.adjust') && (
        <IconButton label={`Ajuste por conteo de ${name}`} icon={IconAdjustmentsHorizontal} onClick={() => onSelect('adjust')} />
      )}
    </>
  )
}
