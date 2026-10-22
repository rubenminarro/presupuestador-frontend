import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { ByMethodTable } from '@/features/payments/ByMethodTable'
import { supplierPaymentsApi } from '@/features/supplier-payments/api'
import { formatDate, formatGuarani } from '@/lib/format'

/** Egresos a proveedores por medio de pago en el período (sin fechas, el día de hoy). */
export function SupplierPaymentsSummaryPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const params = { date_from: dateFrom, date_to: dateTo }

  const query = useQuery({
    queryKey: ['supplier-payments', 'summary', params],
    queryFn: () => supplierPaymentsApi.summary(params),
    placeholderData: keepPreviousData,
  })
  const summary = query.data

  return (
    <>
      <PageHeader
        pretitle="Caja"
        title="Resumen de egresos"
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
        {summary ? (
          <div className={query.isFetching ? 'opacity-50' : undefined}>
            <p className="text-secondary">
              {summary.period.date_from === summary.period.date_to
                ? `Día ${formatDate(summary.period.date_from)}`
                : `Del ${formatDate(summary.period.date_from)} al ${formatDate(summary.period.date_to)}`}{' '}
              · pagos a proveedores vigentes, en guaraníes.
            </p>
            <div className="row row-cards">
              <div className="col-12 col-lg-4">
                <div className="card">
                  <div className="card-body">
                    <div className="subheader">Total pagado</div>
                    <div className="h1 mb-1">{formatGuarani(summary.total)}</div>
                    <div className="text-secondary">
                      {summary.payments_count} pago(s)
                      {summary.cancelled_count > 0 && ` · ${summary.cancelled_count} anulado(s) en el período`}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-8">
                <ByMethodTable rows={summary.by_method} paymentsCount={summary.payments_count} total={summary.total} />
              </div>
            </div>
          </div>
        ) : (
          <div className="card">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
        )}
      </PageBody>
    </>
  )
}
