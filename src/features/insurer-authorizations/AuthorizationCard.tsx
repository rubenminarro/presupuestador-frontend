import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconChecklist, IconPlus } from '@tabler/icons-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { hasInsurerItems, type Budget } from '@/features/budgets/api'
import type { Claim } from '@/features/claims/api'
import { AUTHORIZATION_RESULT, AUTHORIZATION_STATUS, insurerAuthorizationsApi } from '@/features/insurer-authorizations/api'
import { AuthorizationFormModal } from '@/features/insurer-authorizations/AuthorizationFormModal'
import { formatDate, formatDecimal, formatMoney } from '@/lib/format'

/**
 * Autorización de la aseguradora (M6) en el detalle del presupuesto: la vigente con sus líneas y las versiones
 * anteriores (sustituidas o invalidadas al reabrir o cancelar). Se registra con el presupuesto enviado o aprobado y
 * el siniestro abierto.
 */
export function AuthorizationCard({ budget, claim, receptionOpen }: { budget: Budget; claim: Claim | null; receptionOpen: boolean }) {
  const { can } = useAuth()
  const [registering, setRegistering] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const visible = can('insurer-authorizations.index') && hasInsurerItems(budget)

  const query = useQuery({
    queryKey: ['insurer-authorizations', budget.id],
    queryFn: () => insurerAuthorizationsApi.list(budget.id),
    enabled: visible,
  })

  if (!visible) return null

  const versions = query.data ?? []
  const current = versions.find((version) => version.status.value === 'current')
  const previous = versions.filter((version) => version !== current).reverse()
  const canRegister =
    can('insurer-authorizations.store') &&
    receptionOpen &&
    claim?.status.value === 'open' &&
    (budget.status === 'sent' || budget.status === 'approved')

  return (
    <div className="card mt-3">
      <div className="card-header">
        <h3 className="card-title">
          <IconChecklist size={18} className="me-2 text-secondary" aria-hidden="true" />
          Autorización de la aseguradora
        </h3>
        {canRegister && (
          <div className="card-actions">
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setRegistering(true)}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              {current ? 'Registrar nueva versión' : 'Registrar autorización'}
            </button>
          </div>
        )}
      </div>
      {current ? (
        <>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-3 align-items-center">
              <StatusBadge value={current.result.value} map={AUTHORIZATION_RESULT} />
              <span>
                Versión {current.version}
                {current.authorization_number && ` · N.º ${current.authorization_number}`}
              </span>
              <span className="text-secondary">
                {formatDate(current.decided_at)} · {current.channel.label}
                {current.adjuster_name && ` · ${current.adjuster_name}`}
              </span>
              <span className="ms-auto">
                Autorizado (sin IVA): <strong>{formatMoney(current.authorized_total)}</strong>
              </span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Línea</th>
                  <th>Decisión</th>
                  <th className="text-end">Presupuestado</th>
                  <th className="text-end">Autorizado</th>
                </tr>
              </thead>
              <tbody>
                {current.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.description}
                      {item.notes && <div className="small text-secondary">{item.notes}</div>}
                    </td>
                    <td>{item.decision.label}</td>
                    <td className="text-end text-nowrap">
                      {formatMoney(item.budgeted_total)}
                      <div className="small text-secondary">cant. {formatDecimal(item.budgeted_quantity)}</div>
                    </td>
                    <td className="text-end text-nowrap">
                      {formatMoney(item.authorized_total)}
                      <div className="small text-secondary">cant. {formatDecimal(item.authorized_quantity)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {current.documents && current.documents.length > 0 && (
            <div className="card-body small text-secondary">Respaldo: {current.documents.map((document) => document.original_name).join(', ')}</div>
          )}
        </>
      ) : (
        <div className="card-body text-secondary">
          {query.isLoading
            ? 'Cargando…'
            : budget.status === 'draft'
              ? 'Se registra cuando el presupuesto se envía.'
              : 'Sin autorización vigente: las líneas de la aseguradora quedan pendientes y la OT no se crea sin ella (salvo una excepción interna).'}
        </div>
      )}
      {previous.length > 0 && (
        <div className="card-footer">
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setShowHistory((value) => !value)}>
            {showHistory ? 'Ocultar' : 'Ver'} versiones anteriores ({previous.length})
          </button>
          {showHistory && (
            <ul className="list-unstyled small mt-2 mb-0">
              {previous.map((version) => (
                <li key={version.id} className="mb-1">
                  <StatusBadge value={version.status.value} map={AUTHORIZATION_STATUS} /> Versión {version.version} ·{' '}
                  {version.result.label} · {formatMoney(version.authorized_total)}
                  {version.invalidation_reason && <span className="text-secondary"> · {version.invalidation_reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {registering && claim && <AuthorizationFormModal budget={budget} claim={claim} onClose={() => setRegistering(false)} />}
    </div>
  )
}
