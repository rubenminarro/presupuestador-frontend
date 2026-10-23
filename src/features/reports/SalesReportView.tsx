import { Fragment } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Chart } from '@/components/ui/Chart'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/States'
import { INVOICE_CONDITIONS } from '@/features/invoices/api'
import { ByMethodTable } from '@/features/payments/ByMethodTable'
import { reportsApi, type ReportParams, type SalesReport } from '@/features/reports/api'
import { ChartCard, ReportView, StatTile } from '@/features/reports/ReportParts'
import { formatDate, formatGuarani, formatPeriod } from '@/lib/format'

export function SalesReportView({ params }: { params: ReportParams }) {
  const query = useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: () => reportsApi.sales(params),
    placeholderData: keepPreviousData,
  })

  return <ReportView query={query}>{(report) => <Sales report={report} groupBy={params.group_by ?? 'day'} />}</ReportView>
}

/** `YYYY-MM-DD` → dd/mm/aaaa; `YYYY-MM` → mm/aaaa. */
function bucketLabel(period: string): string {
  const month = /^(\d{4})-(\d{2})$/.exec(period)
  return month ? `${month[2]}/${month[1]}` : formatDate(period)
}

function Sales({ report, groupBy }: { report: SalesReport; groupBy: 'day' | 'month' }) {
  const { totals } = report
  // El resumen trae los cuatro medios aunque no tengan pagos; el gráfico muestra solo los usados.
  const methodsUsed = report.collected.by_method.filter((row) => row.payments_count > 0)

  return (
    <>
      <p className="text-secondary">{formatPeriod(report.period)} · facturas emitidas por fecha de emisión, importes con IVA.</p>
      <div className="row row-cards mb-3">
        <StatTile label="Facturado" value={formatGuarani(totals.total)} hint={`${totals.invoices_count} factura(s) emitida(s)`} />
        <StatTile label="Ticket promedio" value={formatGuarani(totals.average_ticket)} />
        <StatTile label="Cobrado" value={formatGuarani(report.collected.total)} hint={`${report.collected.payments_count} pago(s) vigente(s)`} />
        <StatTile
          label="Anuladas"
          value={formatGuarani(report.cancelled.total)}
          hint={`${report.cancelled.invoices_count} factura(s) anulada(s)`}
        />
      </div>
      <div className="row row-cards mb-3">
        <div className="col-12 col-lg-8">
          <ChartCard title={groupBy === 'day' ? 'Facturado por día' : 'Facturado por mes'}>
            {report.by_period.length === 0 ? (
              <EmptyState message="No hay facturas emitidas en el período." />
            ) : (
              <Chart
                type="bar"
                series={[{ name: 'Facturado', data: report.by_period.map((row) => Number(row.total)) }]}
                options={{
                  xaxis: { categories: report.by_period.map((row) => bucketLabel(row.period)) },
                  yaxis: { labels: { formatter: (value) => formatGuarani(value) } },
                  // Con pocas barras, más angostas: si no, una sola ocupa todo el ancho.
                  plotOptions: { bar: { borderRadius: 3, columnWidth: report.by_period.length < 5 ? '20%' : '60%' } },
                }}
              />
            )}
          </ChartCard>
        </div>
        <div className="col-12 col-lg-4">
          <ChartCard title="Cobrado por medio de pago">
            {methodsUsed.length === 0 ? (
              <EmptyState message="No hay cobros en el período." />
            ) : (
              <Chart
                type="donut"
                series={methodsUsed.map((row) => Number(row.total))}
                options={{
                  labels: methodsUsed.map((row) => row.label),
                  tooltip: { y: { formatter: (value) => formatGuarani(value) } },
                }}
              />
            )}
          </ChartCard>
        </div>
      </div>
      <div className="row row-cards">
        <div className="col-12 col-lg-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Composición del facturado</h3>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                {(
                  [
                    ['Exento', totals.exempt],
                    ['Gravado 5%', totals.taxed_5],
                    ['Gravado 10%', totals.taxed_10],
                    ['IVA 5%', totals.iva_5],
                    ['IVA 10%', totals.iva_10],
                    ['Descuentos', totals.discount],
                  ] as const
                ).map(([label, value]) => (
                  <Fragment key={label}>
                    <dt className="col-7 fw-normal">{label}</dt>
                    <dd className="col-5 text-end text-nowrap">{formatGuarani(value)}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <DataTable
            title="Por condición"
            rows={report.by_condition}
            rowKey={(row) => row.condition}
            emptyMessage="Sin facturas en el período."
            columns={[
              { key: 'condition', header: 'Condición', render: (row) => INVOICE_CONDITIONS[row.condition] ?? row.condition },
              { key: 'count', header: 'Facturas', className: 'text-end', render: (row) => row.invoices_count },
              { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (row) => formatGuarani(row.total) },
            ]}
          />
        </div>
        <div className="col-12 col-lg-4">
          <ByMethodTable rows={report.collected.by_method} paymentsCount={report.collected.payments_count} total={report.collected.total} />
        </div>
      </div>
    </>
  )
}
