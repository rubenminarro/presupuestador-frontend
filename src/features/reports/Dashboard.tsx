import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/useAuth'
import { reportsApi, type Dashboard as DashboardData } from '@/features/reports/api'
import { formatGuarani, formatMoney, formatPercent } from '@/lib/format'

interface TileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  /** Pantalla con el detalle; solo se enlaza si el usuario puede abrirla. */
  to?: string | false
}

function Tile({ label, value, hint, to }: TileProps) {
  const body = (
    <div className="card-body">
      <div className="subheader">{label}</div>
      <div className="h1 mb-0 text-nowrap">{value}</div>
      {hint && <div className="text-secondary small mt-1">{hint}</div>}
    </div>
  )

  return (
    <div className="col-6 col-lg-3">
      {to ? (
        <Link to={to} className="card card-link h-100 text-reset text-decoration-none">
          {body}
        </Link>
      ) : (
        <div className="card h-100">{body}</div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h3 className="mt-2 mb-0 text-secondary text-uppercase small fw-bold">{title}</h3>
      <div className="row row-cards mb-3 mt-0">{children}</div>
    </>
  )
}

/** Indicadores del mes en curso; cada bloque llega solo si el usuario tiene el permiso de su reporte. */
export function Dashboard() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: reportsApi.dashboard })

  if (!query.data) {
    return <div className="card mb-3">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
  }

  return <DashboardBlocks data={query.data} />
}

function DashboardBlocks({ data }: { data: DashboardData }) {
  const { can } = useAuth()
  const report = (key: string) => can(`reports.${key}`) && `/reports?report=${key}`
  const { workshop, sales, budgets, profitability, productivity, inventory, maintenance } = data
  const open = workshop.open_work_orders

  return (
    <>
      <Section title="Taller">
        <Tile label="Vehículos en taller" value={workshop.vehicles_in_shop} to={can('receptions.index') && '/receptions'} />
        <Tile
          label="OT abiertas"
          value={open.pending + open.in_progress + open.paused}
          hint={`${open.pending} pendiente(s) · ${open.in_progress} en reparación · ${open.paused} pausada(s)`}
          to={can('work-orders.index') && '/work-orders'}
        />
        <Tile label="OT completadas en el mes" value={workshop.completed_this_month} />
        {productivity && (
          <Tile label="Trabajos completados en el mes" value={productivity.jobs_completed_this_month} to={report('productivity')} />
        )}
      </Section>

      {(sales || budgets || profitability) && (
        <Section title="Ventas del mes">
          {sales && (
            <>
              <Tile label="Facturado" value={formatGuarani(sales.invoiced_this_month)} hint="Con IVA." to={report('sales')} />
              <Tile label="Cobrado" value={formatGuarani(sales.collected_this_month)} to={report('sales')} />
              <Tile label="Por cobrar" value={formatGuarani(sales.receivables)} hint="Saldo total a hoy." to={report('clients')} />
            </>
          )}
          {budgets && (
            <Tile
              label="Presupuestos sin respuesta"
              value={budgets.awaiting_response}
              hint={`${formatMoney(budgets.awaiting_response_total)} · aprobación del mes ${formatPercent(budgets.approval_rate_this_month)}`}
              to={report('budgets')}
            />
          )}
          {profitability && (
            <Tile
              label="Margen bruto"
              value={formatMoney(profitability.gross_margin_this_month)}
              hint={`${formatPercent(profitability.margin_percentage_this_month)} · sin IVA`}
              to={report('profitability')}
            />
          )}
        </Section>
      )}

      {(inventory || maintenance) && (
        <Section title="Stock y mantenimiento">
          {inventory && (
            <>
              <Tile label="Valor del stock" value={formatMoney(inventory.stock_value)} hint="A costo promedio." to={report('inventory')} />
              <Tile label="Repuestos bajo el mínimo" value={inventory.below_minimum} to={report('inventory')} />
            </>
          )}
          {maintenance && (
            <>
              <Tile label="Mantenimientos vencidos" value={maintenance.overdue} to="/maintenance/alerts" />
              <Tile label="Mantenimientos por vencer" value={maintenance.due_soon} to="/maintenance/alerts" />
            </>
          )}
        </Section>
      )}
    </>
  )
}
