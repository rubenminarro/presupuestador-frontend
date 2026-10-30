import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconShieldCheck } from '@tabler/icons-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { CLAIM_STATUS } from '@/features/claims/api'
import { ClaimFormModal } from '@/features/claims/ClaimFormModal'
import { isReceptionOpen, type Reception } from '@/features/receptions/api'

/**
 * Siniestro vigente de la recepción (M3). `reception.claim` solo llega con `claims.show` (el mecánico no ve pólizas ni
 * datos del asegurado). Sin siniestro y con la recepción abierta, se registra desde aquí.
 */
export function ReceptionClaim({ reception }: { reception: Reception }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  if (reception.claim === undefined) return null

  const claim = reception.claim

  if (!claim && !(isReceptionOpen(reception.status.value) && can('claims.store'))) return null

  return (
    <>
      <div className="card mt-3">
        <div className="card-body d-flex align-items-center gap-2">
          <IconShieldCheck size={20} className="text-secondary" aria-hidden="true" />
          {claim ? (
            <>
              <div className="flex-fill">
                Siniestro <Link to={`/claims/${claim.id}`}>{claim.code}</Link>
                {claim.claim_number && <span className="text-secondary"> · N.º {claim.claim_number}</span>}
                <div className="small text-secondary">{claim.insurer ?? 'Aseguradora'}</div>
              </div>
              <StatusBadge value={claim.status.value} map={CLAIM_STATUS} />
            </>
          ) : (
            <>
              <div className="flex-fill text-secondary">Sin siniestro: el trabajo lo paga el cliente.</div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setCreating(true)}>
                Registrar siniestro
              </button>
            </>
          )}
        </div>
      </div>
      {creating && (
        <ClaimFormModal receptionId={reception.id} onClose={() => setCreating(false)} onSaved={(saved) => navigate(`/claims/${saved.id}`)} />
      )}
    </>
  )
}
