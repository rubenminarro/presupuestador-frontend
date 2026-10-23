import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { reportsApi, type ProfitabilityReport, type ReportParams } from '@/features/reports/api'
import { ReportView, StatTile } from '@/features/reports/ReportParts'
import { formatMoney, formatPercent, formatPeriod } from '@/lib/format'

export function ProfitabilityReportView({ params }: { params: ReportParams }) {
  const query = useQuery({
    queryKey: ['reports', 'profitability', params],
    queryFn: () => reportsApi.profitability(params),
    placeholderData: keepPreviousData,
  })

  return <ReportView query={query}>{(report) => <Profitability report={report} />}</ReportView>
}

type MarginRow = ProfitabilityReport['lowest_margin'][number]

const marginColumns: Column<MarginRow>[] = [
  {
    key: 'code',
    header: 'OT',
    render: (row) => <Link to={`/work-orders/${row.work_order_id}`}>{row.work_order_code ?? `#${row.work_order_id}`}</Link>,
  },
  { key: 'sale', header: 'Venta', className: 'text-end text-nowrap', render: (row) => formatMoney(row.sale_total) },
  { key: 'margin', header: 'Margen', className: 'text-end text-nowrap', render: (row) => formatMoney(row.gross_margin) },
  {
    key: 'percentage',
    header: '%',
    className: 'text-end text-nowrap',
    render: (row) => (
      <>
        {formatPercent(row.margin_percentage)}
        {!row.is_cost_complete && (
          <span className="text-warning ms-1" title="Costo incompleto: faltan horas o costos de mano de obra.">
            *
          </span>
        )}
      </>
    ),
  },
]

function Profitability({ report }: { report: ProfitabilityReport }) {
  const { totals } = report

  return (
    <>
      <p className="text-secondary">{formatPeriod(report.period)} · cierres económicos de las OT completadas, importes sin IVA.</p>
      {totals.incomplete_cost_count > 0 && (
        <div className="alert alert-warning">
          {totals.incomplete_cost_count} OT con costo incompleto (sin horas cargadas): su margen usa solo los costos conocidos.
        </div>
      )}
      <div className="row row-cards mb-3">
        <StatTile label="OT cerradas" value={totals.work_orders_count} />
        <StatTile label="Venta" value={formatMoney(totals.sale_total)} />
        <StatTile label="Costo" value={formatMoney(totals.cost_total)} />
        <StatTile label="Margen bruto" value={formatMoney(totals.gross_margin)} hint={formatPercent(totals.margin_percentage)} />
      </div>
      <div className="row row-cards">
        <div className="col-12 col-lg-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Composición</h3>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-7 fw-normal">Venta de mano de obra</dt>
                <dd className="col-5 text-end text-nowrap">{formatMoney(totals.sale_labor)}</dd>
                <dt className="col-7 fw-normal">Venta de repuestos</dt>
                <dd className="col-5 text-end text-nowrap">{formatMoney(totals.sale_parts)}</dd>
                <dt className="col-7">Venta</dt>
                <dd className="col-5 text-end text-nowrap fw-bold">{formatMoney(totals.sale_total)}</dd>
                <dt className="col-7 fw-normal">Costo de repuestos</dt>
                <dd className="col-5 text-end text-nowrap">{formatMoney(totals.cost_parts)}</dd>
                <dt className="col-7 fw-normal">Costo de mano de obra</dt>
                <dd className="col-5 text-end text-nowrap">{formatMoney(totals.cost_labor)}</dd>
                <dt className="col-7 fw-normal">Comisiones</dt>
                <dd className="col-5 text-end text-nowrap">{formatMoney(totals.commission_total)}</dd>
                <dt className="col-7">Costo</dt>
                <dd className="col-5 text-end text-nowrap fw-bold mb-0">{formatMoney(totals.cost_total)}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <DataTable
            title="Menor margen"
            columns={marginColumns}
            rows={report.lowest_margin}
            rowKey={(row) => row.work_order_id}
            emptyMessage="Sin OT cerradas en el período."
          />
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <DataTable
            title="Mayor margen"
            columns={marginColumns}
            rows={report.highest_margin}
            rowKey={(row) => row.work_order_id}
            emptyMessage="Sin OT cerradas en el período."
          />
        </div>
      </div>
    </>
  )
}
