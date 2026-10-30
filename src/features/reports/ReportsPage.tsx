import { useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DownloadButton } from '@/components/ui/DownloadButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { useAuth } from '@/features/auth/useAuth'
import { insurersApi } from '@/features/insurers/api'
import { reportParams, reportsApi, type ReportFilters, type ReportKey, type ReportParams } from '@/features/reports/api'
import { BudgetsReportView } from '@/features/reports/BudgetsReportView'
import { ClaimsReportView } from '@/features/reports/ClaimsReportView'
import { ClientsReportView } from '@/features/reports/ClientsReportView'
import { InventoryReportView } from '@/features/reports/InventoryReportView'
import { ProductivityReportView } from '@/features/reports/ProductivityReportView'
import { ProfitabilityReportView } from '@/features/reports/ProfitabilityReportView'
import { ReceivablesReportView } from '@/features/reports/ReceivablesReportView'
import { SalesReportView } from '@/features/reports/SalesReportView'
import { cx } from '@/lib/cx'

export interface ReportViewProps {
  params: ReportParams
  filters: ReportFilters
  setFilters: (change: Partial<ReportFilters>) => void
}

/** Un reporte por pestaña, con su permiso `reports.<clave>` (el backend lo vuelve a validar). */
const REPORTS: { key: ReportKey; label: string; view: ComponentType<ReportViewProps> }[] = [
  { key: 'sales', label: 'Ventas', view: SalesReportView },
  { key: 'budgets', label: 'Presupuestos', view: BudgetsReportView },
  { key: 'profitability', label: 'Rentabilidad', view: ProfitabilityReportView },
  { key: 'productivity', label: 'Productividad', view: ProductivityReportView },
  { key: 'inventory', label: 'Inventario', view: InventoryReportView },
  { key: 'clients', label: 'Clientes', view: ClientsReportView },
  { key: 'receivables', label: 'Cuentas por cobrar', view: ReceivablesReportView },
  { key: 'claims', label: 'Siniestros', view: ClaimsReportView },
]

const INITIAL_FILTERS: ReportFilters = {
  date_from: '',
  date_to: '',
  group_by: 'day',
  recipient_type: '',
  client_id: null,
  insurer_id: '',
  status: '',
}

/** Reportes de solo lectura por período (sin fechas, el mes en curso), con exportación a CSV y PDF. */
export function ReportsPage() {
  const { can } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilterState] = useState<ReportFilters>(INITIAL_FILTERS)
  const setFilters = (change: Partial<ReportFilters>) => setFilterState((current) => ({ ...current, ...change }))

  const allowed = REPORTS.filter((report) => can(`reports.${report.key}`))
  // La pestaña va en la URL (`?report=sales`) para poder enlazarla desde el dashboard.
  const active = allowed.find((report) => report.key === searchParams.get('report')) ?? allowed[0]

  const insurers = useQuery({
    queryKey: ['insurers', 'report-filter'],
    queryFn: () => insurersApi.list({ per_page: 100 }),
    enabled: active.key === 'claims' && can('insurers.index'),
  })

  const params = reportParams(active.key, filters)
  const View = active.view

  return (
    <>
      <PageHeader
        pretitle="Gestión"
        title="Reportes"
        actions={
          <div className="d-flex flex-wrap gap-2">
            {/* Cuentas por cobrar es a hoy: sin período. */}
            {active.key !== 'receivables' && (
              <>
                <input
                  type="date"
                  className="form-control w-auto"
                  aria-label="Desde"
                  title="Desde"
                  value={filters.date_from}
                  max={filters.date_to || undefined}
                  onChange={(event) => setFilters({ date_from: event.target.value })}
                />
                <input
                  type="date"
                  className="form-control w-auto"
                  aria-label="Hasta"
                  title="Hasta"
                  value={filters.date_to}
                  min={filters.date_from || undefined}
                  onChange={(event) => setFilters({ date_to: event.target.value })}
                />
              </>
            )}
            {active.key === 'sales' && (
              <select
                className="form-select w-auto"
                aria-label="Agrupar por"
                value={filters.group_by}
                onChange={(event) => setFilters({ group_by: event.target.value as 'day' | 'month' })}
              >
                <option value="day">Por día</option>
                <option value="month">Por mes</option>
              </select>
            )}
            {active.key === 'claims' && (
              <>
                {can('insurers.index') && (
                  <select
                    className="form-select w-auto"
                    aria-label="Aseguradora"
                    value={filters.insurer_id}
                    onChange={(event) => setFilters({ insurer_id: event.target.value })}
                  >
                    <option value="">Todas las aseguradoras</option>
                    {(insurers.data?.items ?? []).map((insurer) => (
                      <option key={insurer.id} value={insurer.id}>
                        {insurer.client?.display_name ?? insurer.code}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  className="form-select w-auto"
                  aria-label="Estado"
                  value={filters.status}
                  onChange={(event) => setFilters({ status: event.target.value as ReportFilters['status'] })}
                >
                  <option value="">Todos los estados</option>
                  <option value="open">Abiertos</option>
                  <option value="closed">Cerrados</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </>
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
        <View params={params} filters={filters} setFilters={setFilters} />
      </PageBody>
    </>
  )
}
