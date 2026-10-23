import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Chart } from '@/components/ui/Chart'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BUDGET_STATUS } from '@/features/budgets/api'
import { reportsApi, type BudgetsReport, type ReportParams } from '@/features/reports/api'
import { ChartCard, ReportView, StatTile } from '@/features/reports/ReportParts'
import { formatMoney, formatPercent, formatPeriod } from '@/lib/format'

export function BudgetsReportView({ params }: { params: ReportParams }) {
  const query = useQuery({
    queryKey: ['reports', 'budgets', params],
    queryFn: () => reportsApi.budgets(params),
    placeholderData: keepPreviousData,
  })

  return <ReportView query={query}>{(report) => <Budgets report={report} />}</ReportView>
}

function Budgets({ report }: { report: BudgetsReport }) {
  return (
    <>
      <p className="text-secondary">{formatPeriod(report.period)} · presupuestos creados en el período, según su estado actual; totales con IVA.</p>
      <div className="row row-cards mb-3">
        <StatTile className="col-12 col-sm-4" label="Presupuestos" value={report.budgets_count} />
        <StatTile className="col-12 col-sm-4" label="Total presupuestado" value={formatMoney(report.total)} />
        <StatTile
          className="col-12 col-sm-4"
          label="Tasa de aprobación"
          value={formatPercent(report.approval_rate)}
          hint="Aprobados sobre aprobados + rechazados."
        />
      </div>
      <div className="row row-cards">
        <div className="col-12 col-lg-6">
          <ChartCard title="Presupuestos por estado">
            <Chart
              type="bar"
              series={[{ name: 'Presupuestos', data: report.by_status.map((row) => row.budgets_count) }]}
              options={{
                xaxis: { categories: report.by_status.map((row) => BUDGET_STATUS[row.status]?.label ?? row.status) },
                yaxis: { labels: { formatter: (value) => String(Math.round(value)) } },
                plotOptions: { bar: { borderRadius: 3, columnWidth: '50%', distributed: true } },
                legend: { show: false },
              }}
            />
          </ChartCard>
        </div>
        <div className="col-12 col-lg-6">
          <DataTable
            title="Detalle por estado"
            rows={report.by_status}
            rowKey={(row) => row.status}
            columns={[
              { key: 'status', header: 'Estado', render: (row) => <StatusBadge value={row.status} map={BUDGET_STATUS} /> },
              { key: 'count', header: 'Cantidad', className: 'text-end', render: (row) => row.budgets_count },
              { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (row) => formatMoney(row.total) },
            ]}
          />
        </div>
      </div>
    </>
  )
}
