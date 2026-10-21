import type { ReactNode } from 'react'
import { IconSearch } from '@tabler/icons-react'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States'
import { cx } from '@/lib/cx'
import type { Pagination as PaginationData } from '@/types/api'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyMessage?: string
  pagination?: PaginationData
  onPageChange?: (page: number) => void
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  /** Filtros o botones extra junto a la búsqueda. */
  toolbar?: ReactNode
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  emptyMessage = 'No hay registros para mostrar.',
  pagination,
  onPageChange,
  search,
  toolbar,
  onRowClick,
}: DataTableProps<T>) {
  const hasHeader = Boolean(search || toolbar)

  function renderBody() {
    if (error) return <ErrorState error={error} onRetry={onRetry} />
    if (isLoading && !rows) return <LoadingState />
    if (!rows || rows.length === 0) return <EmptyState message={emptyMessage} />

    return (
      <div className="table-responsive">
        <table className="table card-table table-vcenter">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cx(onRowClick && 'cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="card">
      {hasHeader && (
        <div className="card-header gap-2 flex-wrap">
          {search && (
            <div className="input-icon flex-fill" style={{ maxWidth: '22rem' }}>
              <span className="input-icon-addon">
                <IconSearch size={16} aria-hidden="true" />
              </span>
              <input
                type="search"
                className="form-control"
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder ?? 'Buscar…'}
                aria-label={search.placeholder ?? 'Buscar'}
              />
            </div>
          )}
          {toolbar && <div className="ms-auto d-flex flex-wrap gap-2">{toolbar}</div>}
        </div>
      )}
      <div className={cx(isLoading && rows && 'opacity-50')}>{renderBody()}</div>
      {pagination && onPageChange && !error && (
        <div className="card-footer">
          <Pagination pagination={pagination} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  )
}
