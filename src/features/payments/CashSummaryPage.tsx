import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { paymentsApi, type CashSummary } from '@/features/payments/api'
import { formatDate, formatGuarani } from '@/lib/format'

/** Resumen de caja: pagos vigentes por medio de pago en el período (sin fechas, el día de hoy). */
export function CashSummaryPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const params = { date_from: dateFrom, date_to: dateTo }

  const query = useQuery({
    queryKey: ['payments', 'summary', params],
    queryFn: () => paymentsApi.summary(params),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        pretitle="Caja"
        title="Resumen de caja"
        actions={
          <div className="d-flex flex-wrap gap-2">
            <input
              type="date"
              className="form-control w-auto"
              aria-label="Desde"
              title="Desde"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <input
              type="date"
              className="form-control w-auto"
              aria-label="Hasta"
              title="Hasta"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        }
      />
      <PageBody>
        {query.data ? (
          <div className={query.isFetching ? 'opacity-50' : undefined}>
            <SummaryCards summary={query.data} />
          </div>
        ) : (
          <div className="card">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
        )}
      </PageBody>
    </>
  )
}

function SummaryCards({ summary }: { summary: CashSummary }) {
  const { date_from: from, date_to: to } = summary.period

  return (
    <>
      <p className="text-secondary">
        {from === to ? `Día ${formatDate(from)}` : `Del ${formatDate(from)} al ${formatDate(to)}`} · pagos vigentes, en guaraníes.
      </p>
      <div className="row row-cards">
        <div className="col-12 col-lg-4">
          <div className="card">
            <div className="card-body">
              <div className="subheader">Total cobrado</div>
              <div className="h1 mb-1">{formatGuarani(summary.total)}</div>
              <div className="text-secondary">
                {summary.payments_count} pago(s)
                {summary.cancelled_count > 0 && ` · ${summary.cancelled_count} anulado(s) en el período`}
              </div>
            </div>
          </div>
          <div className="card mt-3">
            <div className="card-header">
              <h3 className="card-title">Efectivo</h3>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-7 fw-normal">Recibido de clientes</dt>
                <dd className="col-5 text-end">{formatGuarani(summary.cash.received)}</dd>
                <dt className="col-7 fw-normal">Vuelto entregado</dt>
                <dd className="col-5 text-end mb-0">{formatGuarani(summary.cash.change)}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Por medio de pago</h3>
            </div>
            <div className="table-responsive">
              <table className="table card-table table-vcenter">
                <thead>
                  <tr>
                    <th>Medio</th>
                    <th className="text-end">Pagos</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_method.map((row) => (
                    <tr key={row.method}>
                      <td>{row.label}</td>
                      <td className="text-end">{row.payments_count}</td>
                      <td className="text-end text-nowrap">{formatGuarani(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th className="text-end">{summary.payments_count}</th>
                    <th className="text-end text-nowrap">{formatGuarani(summary.total)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
