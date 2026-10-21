import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { inventoryApi, MOVEMENT_TYPE, type InventoryMovement } from '@/features/inventory/api'
import { MovementDetailModal } from '@/features/inventory/MovementDetailModal'
import { cx } from '@/lib/cx'
import { formatDateTime, formatMoney, formatQuantity } from '@/lib/format'
import { useListParams } from '@/lib/useListParams'

interface MovementsTableProps {
  /** Movimientos de un repuesto (`parts/{id}/movements`); sin él, todos (`inventory/movements`). */
  partId?: number
  title?: string
}

/** Kardex: movimientos inmutables, del más reciente al más antiguo, con saldo y costo promedio resultantes. */
export function MovementsTable({ partId, title }: MovementsTableProps) {
  const { can } = useAuth()
  const list = useListParams()
  const [type, setType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<InventoryMovement | null>(null)

  // Estos endpoints no buscan por texto: solo filtros.
  const params = { page: list.params.page, per_page: list.params.per_page, type, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: partId ? ['inventory', 'part-movements', partId, params] : ['inventory', 'movements', params],
    queryFn: () => (partId ? inventoryApi.partMovements(partId, params) : inventoryApi.movements(params)),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  const columns: Column<InventoryMovement>[] = [
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (movement) => formatDateTime(movement.created_at) },
    { key: 'type', header: 'Tipo', render: (movement) => <StatusBadge value={movement.type.value} map={MOVEMENT_TYPE} /> },
    ...(partId
      ? []
      : [
          {
            key: 'part',
            header: 'Repuesto',
            render: (movement: InventoryMovement) =>
              movement.part ? (
                <Link to={`/parts/${movement.part.id}`} onClick={(event) => event.stopPropagation()}>
                  <span className="text-secondary me-1">{movement.part.code}</span>
                  {movement.part.name}
                </Link>
              ) : (
                '—'
              ),
          },
        ]),
    {
      key: 'quantity',
      header: 'Cantidad',
      className: 'text-end text-nowrap',
      render: (movement) => (
        <span className={cx(movement.type.direction === 'in' ? 'text-green' : 'text-red')}>
          {movement.type.direction === 'in' ? '+' : ''}
          {formatQuantity(movement.quantity)}
        </span>
      ),
    },
    { key: 'cost', header: 'Costo unit. (sin IVA)', className: 'text-end text-nowrap', render: (movement) => formatMoney(movement.unit_cost) },
    { key: 'balance', header: 'Saldo', className: 'text-end', render: (movement) => formatQuantity(movement.balance_after) },
    { key: 'document', header: 'Documento', render: (movement) => movement.document_number ?? '—' },
    { key: 'user', header: 'Usuario', render: (movement) => movement.created_by?.name ?? '—' },
  ]

  return (
    <>
      <DataTable
        title={title}
        columns={columns}
        rows={query.data?.items}
        rowKey={(movement) => movement.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="No hay movimientos para mostrar."
        pagination={query.data?.pagination}
        onPageChange={list.setPage}
        onRowClick={can('inventory.show') ? setSelected : undefined}
        toolbar={
          <>
            <select
              className="form-select form-select-sm w-auto"
              aria-label="Filtrar por tipo"
              value={type}
              onChange={(event) => filter(setType)(event.target.value)}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(MOVEMENT_TYPE).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              aria-label="Desde"
              title="Desde"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => filter(setDateFrom)(event.target.value)}
            />
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              aria-label="Hasta"
              title="Hasta"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => filter(setDateTo)(event.target.value)}
            />
          </>
        }
      />
      {selected && <MovementDetailModal movementId={selected.id} onClose={() => setSelected(null)} />}
    </>
  )
}
