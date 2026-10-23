import { useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DownloadButton } from '@/components/ui/DownloadButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { useAuth } from '@/features/auth/useAuth'
import { reportsApi, type ReportKey, type ReportParams } from '@/features/reports/api'
import { BudgetsReportView } from '@/features/reports/BudgetsReportView'
import { ClientsReportView } from '@/features/reports/ClientsReportView'
import { InventoryReportView } from '@/features/reports/InventoryReportView'
import { ProductivityReportView } from '@/features/reports/ProductivityReportView'
import { ProfitabilityReportView } from '@/features/reports/ProfitabilityReportView'
import { SalesReportView } from '@/features/reports/SalesReportView'
import { cx } from '@/lib/cx'

/** Un reporte por pestaña, con su permiso `reports.<clave>` (el backend lo vuelve a validar). */
const REPORTS: { key: ReportKey; label: string; view: ComponentType<{ params: ReportParams }> }[] = [
  { key: 'sales', label: 'Ventas', view: SalesReportView },
  { key: 'budgets', label: 'Presupuestos', view: BudgetsReportView },
  { key: 'profitability', label: 'Rentabilidad', view: ProfitabilityReportView },
  { key: 'productivity', label: 'Productividad', view: ProductivityReportView },
  { key: 'inventory', label: 'Inventario', view: InventoryReportView },
  { key: 'clients', label: 'Clientes', view: ClientsReportView },
]

/** Reportes de solo lectura por período (sin fechas, el mes en curso), con exportación a CSV y PDF. */
export function ReportsPage() {
  const { can } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day')

  const allowed = REPORTS.filter((report) => can(`reports.${report.key}`))
  // La pestaña va en la URL (`?report=sales`) para poder enlazarla desde el dashboard.
  const active = allowed.find((report) => report.key === searchParams.get('report')) ?? allowed[0]

  const params: ReportParams = { date_from: dateFrom, date_to: dateTo, ...(active.key === 'sales' && { group_by: groupBy }) }
  const View = active.view

  return (
    <>
      <PageHeader
        pretitle="Gestión"
        title="Reportes"
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
            {active.key === 'sales' && (
              <select
                className="form-select w-auto"
                aria-label="Agrupar por"
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value as 'day' | 'month')}
              >
                <option value="day">Por día</option>
                <option value="month">Por mes</option>
              </select>
            )}
            <DownloadButton label="CSV" onDownload={() => reportsApi.download(active.key, 'csv', params)} />
            <DownloadButton label="PDF" onDownload={() => reportsApi.download(active.key, 'pdf', params)} />
          </div>
        }
      />
      <PageBody>
        {allowed.length > 1 && (
          <ul className="nav nav-tabs mb-3" role="tablist">
            {allowed.map((report) => (
              <li key={report.key} className="nav-item" role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={report.key === active.key}
                  className={cx('nav-link', report.key === active.key && 'active')}
                  onClick={() => setSearchParams({ report: report.key }, { replace: true })}
                >
                  {report.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <View params={params} />
      </PageBody>
    </>
  )
}
