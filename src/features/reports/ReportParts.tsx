import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState, LoadingState } from '@/components/ui/States'

/** Indicador con su rótulo y una aclaración opcional (p. ej. "con IVA"). */
export function StatTile({ label, value, hint, className = 'col-6 col-lg-3' }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="card h-100">
        <div className="card-body">
          <div className="subheader">{label}</div>
          <div className="h2 mb-0 text-nowrap">{value}</div>
          {hint && <div className="text-secondary small mt-1">{hint}</div>}
        </div>
      </div>
    </div>
  )
}

/** Tarjeta con título para un gráfico. */
export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card h-100">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

/** Carga, error o el reporte (atenuado mientras se refresca con otro período). */
export function ReportView<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.data) return <div className={query.isFetching ? 'opacity-50' : undefined}>{children(query.data)}</div>
  return <div className="card">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
}
