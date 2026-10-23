import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Chart } from '@/components/ui/Chart'
import { DataTable } from '@/components/ui/DataTable'
import { reportsApi, type ProductivityReport, type ReportParams } from '@/features/reports/api'
import { ChartCard, ReportView } from '@/features/reports/ReportParts'
import { formatDecimal, formatMoney, formatPeriod } from '@/lib/format'

export function ProductivityReportView({ params }: { params: ReportParams }) {
  const query = useQuery({
    queryKey: ['reports', 'productivity', params],
    queryFn: () => reportsApi.productivity(params),
    placeholderData: keepPreviousData,
  })

  return <ReportView query={query}>{(report) => <Productivity report={report} />}</ReportView>
}

function Productivity({ report }: { report: ProductivityReport }) {
  const { mechanics } = report

  return (
    <>
      <p className="text-secondary">
        {formatPeriod(report.period)} · OT completadas en el período; venta de mano de obra atribuida según la participación, sin IVA.
      </p>
      {mechanics.length > 0 && (
        <div className="mb-3">
          <ChartCard title="Venta de mano de obra atribuida">
            <Chart
              type="bar"
              height={Math.max(160, mechanics.length * 48)}
              series={[{ name: 'Venta atribuida', data: mechanics.map((row) => Number(row.labor_sale_attributed)) }]}
              options={{
                xaxis: { categories: mechanics.map((row) => row.full_name || row.employee_code), labels: { formatter: (value) => formatMoney(value) } },
                plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
                tooltip: { y: { formatter: (value) => formatMoney(value) } },
              }}
            />
          </ChartCard>
        </div>
      )}
      <DataTable
        title="Por mecánico"
        rows={mechanics}
        rowKey={(row) => row.mechanic_id}
        emptyMessage="No hay trabajos completados en el período."
        columns={[
          {
            key: 'mechanic',
            header: 'Mecánico',
            render: (row) => (
              <>
                <div>{row.full_name || '—'}</div>
                <div className="text-secondary small">{row.employee_code}</div>
              </>
            ),
          },
          { key: 'responsible', header: 'OT como responsable', className: 'text-end', render: (row) => row.work_orders_as_responsible },
          { key: 'jobs', header: 'Trabajos', className: 'text-end', render: (row) => row.jobs_completed },
          { key: 'sale', header: 'Venta atribuida', className: 'text-end text-nowrap', render: (row) => formatMoney(row.labor_sale_attributed) },
          { key: 'commission', header: 'Comisiones', className: 'text-end text-nowrap', render: (row) => formatMoney(row.commission_total) },
          { key: 'hours', header: 'Horas', className: 'text-end', render: (row) => formatDecimal(row.hours_logged) },
          { key: 'cost', header: 'Costo de mano de obra', className: 'text-end text-nowrap', render: (row) => formatMoney(row.labor_cost) },
        ]}
      />
    </>
  )
}
