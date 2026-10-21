import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { cx } from '@/lib/cx'
import type { Pagination as PaginationData } from '@/types/api'

interface PaginationProps {
  pagination: PaginationData
  onPageChange: (page: number) => void
}

/** Páginas visibles: primera, última y dos a cada lado de la actual; `null` marca un salto. */
function visiblePages(current: number, last: number): Array<number | null> {
  const pages: Array<number | null> = []
  for (let page = 1; page <= last; page++) {
    if (page === 1 || page === last || Math.abs(page - current) <= 2) {
      pages.push(page)
    } else if (pages[pages.length - 1] !== null) {
      pages.push(null)
    }
  }
  return pages
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { total, perPage, currentPage, lastPage } = pagination
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)

  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      <p className="m-0 text-secondary">
        Mostrando <span>{from}</span>–<span>{to}</span> de <span>{total}</span>
      </p>
      {lastPage > 1 && (
        <nav className="ms-auto" aria-label="Paginación">
          <ul className="pagination m-0">
            <li className={cx('page-item', currentPage <= 1 && 'disabled')}>
              <button
                type="button"
                className="page-link"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Página anterior"
              >
                <IconChevronLeft size={16} aria-hidden="true" />
              </button>
            </li>
            {visiblePages(currentPage, lastPage).map((page, index) =>
              page === null ? (
                <li key={`gap-${index}`} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              ) : (
                <li key={page} className={cx('page-item', page === currentPage && 'active')}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => onPageChange(page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                </li>
              ),
            )}
            <li className={cx('page-item', currentPage >= lastPage && 'disabled')}>
              <button
                type="button"
                className="page-link"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= lastPage}
                aria-label="Página siguiente"
              >
                <IconChevronRight size={16} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
