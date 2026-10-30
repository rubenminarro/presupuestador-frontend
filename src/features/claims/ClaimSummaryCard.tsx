import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconAlertTriangle } from '@tabler/icons-react'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/useAuth'
import { claimsApi, type Claim, type ClaimEconomicSummary } from '@/features/claims/api'
import { formatGuarani, formatMoney } from '@/lib/format'

/**
 * Resumen económico del siniestro (M11): de lo presupuestado a lo cobrado, sobre todos los presupuestos y OT de la
 * recepción. Cada bloque aparece si el backend lo envía (según el permiso); los sin IVA y el con IVA no se suman.
 */
export function ClaimSummaryCard({ claim }: { claim: Claim }) {
  const query = useQuery({
    queryKey: ['claims', 'summary', claim.id],
    queryFn: () => claimsApi.summary(claim.id),
  })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Resumen económico</h3>
      </div>
      {query.data ? (
        <SummaryBody summary={query.data} />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <LoadingState />
      )}
    </div>
  )
}

export function SummaryBody({ summary }: { summary: ClaimEconomicSummary }) {
  const { can } = useAuth()
  const { budgets, allocations, billing } = summary

  return (
    <>
      {summary.alerts.length > 0 && (
        <div className="card-body border-bottom">
          {summary.alerts.map((alert) => (
            <div key={alert} className="d-flex gap-2 text-warning">
              <IconAlertTriangle size={18} className="flex-shrink-0" aria-hidden="true" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {budgets && (
        <div className="card-body border-bottom">
          <h4 className="mb-1">Presupuestos (sin IVA)</h4>
          <div className="small text-secondary mb-2">Los totales suman solo los presupuestos aprobados.</div>
          <div className="table-responsive">
            <table className="table table-sm table-vcenter mb-0">
              <thead>
                <tr>
                  <th>Presupuesto</th>
                  <th className="text-end">Aseguradora</th>
                  <th className="text-end">Dueño</th>
                  <th>Autorización</th>
                  <th className="text-end">Aceptado por el dueño</th>
                </tr>
              </thead>
              <tbody>
                {budgets.items.map((budget) => (
                  <tr key={budget.budget_id}>
                    <td>
                      {can('budgets.show') ? <Link to={`/budgets/${budget.budget_id}`}>{budget.code}</Link> : budget.code}
                      <div className="small text-secondary">{budget.status_label}</div>
                    </td>
                    <td className="text-end text-nowrap">{formatMoney(budget.insurer_amount)}</td>
                    <td className="text-end text-nowrap">{formatMoney(budget.owner_amount)}</td>
                    <td className="text-nowrap">
                      {budget.authorization_version === null ? (
                        <span className="text-secondary">Sin autorización</span>
                      ) : (
                        <>
                          {formatMoney(budget.authorized_total)}
                          <div className="small text-secondary">
                            v{budget.authorization_version} · {budget.authorization_result}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="text-end text-nowrap">{budget.accepted_owner_amount === null ? '—' : formatMoney(budget.accepted_owner_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-bold">
                  <td>Aprobados</td>
                  <td className="text-end text-nowrap">{formatMoney(budgets.totals.insurer_amount)}</td>
                  <td className="text-end text-nowrap">{formatMoney(budgets.totals.owner_amount)}</td>
                  <td className="text-nowrap">{formatMoney(budgets.totals.authorized_total)}</td>
                  <td className="text-end text-nowrap">{formatMoney(budgets.totals.accepted_owner_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {allocations && (
        <div className="card-body border-bottom">
          <h4 className="mb-2">Reparto confirmado (sin IVA)</h4>
          <div className="table-responsive">
            <table className="table table-sm table-vcenter mb-0">
              <thead>
                <tr>
                  <th>Orden de trabajo</th>
                  <th className="text-end">Aseguradora</th>
                  <th className="text-end">Dueño</th>
                  <th className="text-end">Taller</th>
                  <th className="text-end">Deducible</th>
                </tr>
              </thead>
              <tbody>
                {allocations.work_orders.map((workOrder) => (
                  <tr key={workOrder.work_order_id}>
                    <td>
                      {can('work-orders.show') ? (
                        <Link to={`/work-orders/${workOrder.work_order_id}`}>{workOrder.work_order_code}</Link>
                      ) : (
                        workOrder.work_order_code
                      )}
                      <div className="small text-secondary">
                        {workOrder.work_order_status}
                        {workOrder.allocation_version !== null
                          ? ` · reparto v${workOrder.allocation_version}`
                          : workOrder.requires_allocation
                            ? ' · sin reparto confirmado'
                            : ' · particular'}
                      </div>
                    </td>
                    <td className="text-end text-nowrap">{formatMoney(workOrder.insurer_amount)}</td>
                    <td className="text-end text-nowrap">{formatMoney(workOrder.owner_amount)}</td>
                    <td className="text-end text-nowrap">{formatMoney(workOrder.workshop_amount)}</td>
                    <td className="text-end text-nowrap">{workOrder.deductible_amount === null ? '—' : formatMoney(workOrder.deductible_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-bold">
                  <td>Total</td>
                  <td className="text-end text-nowrap">{formatMoney(allocations.totals.insurer_amount)}</td>
                  <td className="text-end text-nowrap">{formatMoney(allocations.totals.owner_amount)}</td>
                  <td className="text-end text-nowrap">{formatMoney(allocations.totals.workshop_amount)}</td>
                  <td className="text-end text-nowrap">{formatMoney(allocations.totals.deductible_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {allocations.totals.deductible_fiscal_pending && (
            <div className="small text-warning mt-2">El deducible asignado todavía no se factura (falta definir su modalidad).</div>
          )}
        </div>
      )}

      {billing && (
        <div className="card-body">
          <h4 className="mb-1">Facturación (con IVA)</h4>
          <div className="small text-secondary mb-2">Neto = emitido menos notas de crédito. Los totales suman solo las facturas emitidas.</div>
          <div className="row row-cards mb-2">
            {billing.by_recipient.map((group) => (
              <div key={group.recipient_type} className="col-12 col-md-6">
                <div className="card card-sm">
                  <div className="card-body">
                    <div className="subheader">{group.recipient_label}</div>
                    <div className="d-flex justify-content-between">
                      <span>Neto facturado</span>
                      <strong>{formatGuarani(group.net_invoiced)}</strong>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Cobrado</span>
                      <span>{formatGuarani(group.collected)}</span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Saldo</span>
                      <span>{formatGuarani(group.balance)}</span>
                    </div>
                    <div className="small text-secondary mt-1">
                      {group.invoices_count} emitida(s)
                      {Number(group.credited_total) > 0 && ` · acreditado ${formatGuarani(group.credited_total)}`}
                      {group.drafts_count > 0 && ` · ${group.drafts_count} en borrador`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {billing.invoices.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm table-vcenter mb-0">
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Destinatario</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.invoices.map((invoice) => (
                    <tr key={invoice.invoice_id}>
                      <td>
                        <Link to={`/invoices/${invoice.invoice_id}`}>{invoice.number ?? 'Borrador'}</Link>
                        <div className="small text-secondary">
                          {[invoice.work_order_code, invoice.status_label, invoice.payment_status].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td>
                        {invoice.customer_name}
                        <div className="small text-secondary">
                          {invoice.recipient_label} · {invoice.condition}
                        </div>
                      </td>
                      <td className="text-end text-nowrap">{formatGuarani(invoice.total)}</td>
                      <td className="text-end text-nowrap">{invoice.status === 'issued' ? formatGuarani(invoice.balance) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!budgets && !allocations && !billing && summary.alerts.length === 0 && (
        <div className="card-body text-secondary">Sin información económica disponible para su usuario.</div>
      )}
    </>
  )
}
