import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconBan, IconPencil } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { CLAIM_STATUS, claimsApi, type Claim } from '@/features/claims/api'
import { ClaimDocumentsCard } from '@/features/claims/ClaimDocumentsCard'
import { ClaimSummaryCard } from '@/features/claims/ClaimSummaryCard'
import { ClaimFormModal } from '@/features/claims/ClaimFormModal'
import { isReceptionOpen } from '@/features/receptions/api'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

export function ClaimDetailPage() {
  const { id } = useParams()
  const claimId = Number(id)
  const query = useQuery({
    queryKey: ['claims', 'detail', claimId],
    queryFn: () => claimsApi.show(claimId),
    enabled: Number.isInteger(claimId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Siniestros" title="Siniestro" />
        <PageBody>
          <div className="card">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
        </PageBody>
      </>
    )
  }

  return <ClaimDetail claim={query.data} />
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="col-5">{label}</dt>
      <dd className="col-7">{children ?? '—'}</dd>
    </>
  )
}

function ClaimDetail({ claim }: { claim: Claim }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const reception = claim.reception
  // Solo un siniestro abierto de una recepción abierta se edita o cancela (CLAIM_NOT_EDITABLE, RECEPTION_CLOSED).
  const editable = claim.status.value === 'open' && (!reception || isReceptionOpen(reception.status.value))

  const cancel = useApiMutation((reason: string) => claimsApi.cancel(claim.id, reason), {
    invalidate: [['claims'], ['receptions'], ['budgets']],
    successMessage: 'Siniestro cancelado. Las líneas a cargo de la aseguradora de los presupuestos en borrador volvieron al dueño.',
    onSuccess: () => setCancelling(false),
  })

  const deductible = claim.deductible_amount
  const deductibleBlocks = claim.status.value === 'open' && (deductible === null || Number(deductible) > 0)

  return (
    <>
      <PageHeader
        pretitle={`Siniestro · ${claim.claim_type.label}`}
        title={`${claim.code}${claim.claim_number ? ` · N.º ${claim.claim_number}` : ''}`}
        actions={
          <>
            <Link to="/claims" className="btn btn-link">
              <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
              Siniestros
            </Link>
            {editable && can('claims.update') && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setEditing(true)}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar
              </button>
            )}
            {editable && can('claims.cancel') && (
              <button type="button" className="btn btn-outline-warning" onClick={() => setCancelling(true)}>
                <IconBan size={18} className="me-1" aria-hidden="true" />
                Cancelar
              </button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="row row-cards">
          <div className="col-12 col-lg-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Siniestro</h3>
                <div className="card-actions">
                  <StatusBadge value={claim.status.value} map={CLAIM_STATUS} />
                </div>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <Row label="Aseguradora">
                    {claim.insurer && (can('insurers.show') ? <Link to={`/insurers/${claim.insurer.id}`}>{claim.insurer.name}</Link> : claim.insurer.name)}
                  </Row>
                  <Row label="Póliza">{claim.policy_number}</Row>
                  <Row label="Fecha">{formatDate(claim.loss_date)}</Row>
                  {reception && (
                    <>
                      <Row label="Recepción">
                        <Link to={`/receptions/${reception.id}`}>#{reception.id}</Link> · {reception.status.label}
                      </Row>
                      <Row label="Vehículo">
                        {reception.vehicle?.plate ?? '—'}
                        <div className="small text-secondary">{[reception.vehicle?.brand, reception.vehicle?.model].filter(Boolean).join(' ')}</div>
                      </Row>
                      <Row label="Cliente">{reception.client?.display_name}</Row>
                    </>
                  )}
                  <dt className="col-12">Descripción</dt>
                  <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                    {claim.loss_description ?? <span className="text-secondary">Sin descripción.</span>}
                  </dd>
                </dl>
                {claim.status.value === 'cancelled' && (
                  <div className="alert alert-secondary mt-3 mb-0">
                    Cancelado {formatDateTime(claim.cancelled_at)}
                    {claim.cancelled_by && ` por ${claim.cancelled_by.name}`}: {claim.cancellation_reason}
                  </div>
                )}
              </div>
            </div>
            <div className="card mt-3">
              <div className="card-header">
                <h3 className="card-title">Cobertura</h3>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <Row label="Deducible">{deductible === null ? <span className="text-warning">Desconocido</span> : formatMoney(deductible)}</Row>
                </dl>
                {deductibleBlocks && (
                  <div className="small text-secondary mt-2">
                    {deductible === null
                      ? 'Con el deducible desconocido el reparto no se confirma y la recepción no se entrega.'
                      : 'Con deducible mayor a 0 la OT no se factura ni se entrega por el flujo habitual (pendiente M10).'}
                  </div>
                )}
                {claim.coverage_notes && (
                  <p className="mt-2 mb-0" style={{ whiteSpace: 'pre-line' }}>
                    {claim.coverage_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-8">
            <div className="row row-cards">
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-header">
                    <h3 className="card-title">Asegurado</h3>
                  </div>
                  <div className="card-body">
                    <dl className="row mb-0">
                      <Row label="Nombre">{claim.insured.name}</Row>
                      <Row label="Documento">{claim.insured.document}</Row>
                      <Row label="Teléfono">{claim.insured.phone}</Row>
                      <Row label="Email">{claim.insured.email}</Row>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-header">
                    <h3 className="card-title">Perito</h3>
                  </div>
                  <div className="card-body">
                    <dl className="row mb-0">
                      <Row label="Nombre">{claim.adjuster.name}</Row>
                      <Row label="Teléfono">{claim.adjuster.phone}</Row>
                      <Row label="Email">{claim.adjuster.email}</Row>
                      <Row label="Inspección">
                        {claim.adjuster.inspected_at
                          ? `realizada ${formatDateTime(claim.adjuster.inspected_at)}`
                          : claim.adjuster.inspection_scheduled_at
                            ? `agendada ${formatDateTime(claim.adjuster.inspection_scheduled_at)}`
                            : null}
                      </Row>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <ClaimSummaryCard claim={claim} />
              </div>
              <div className="col-12">
                <ClaimDocumentsCard claim={claim} />
              </div>
            </div>
          </div>
        </div>
      </PageBody>
      {editing && <ClaimFormModal claim={claim} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={cancelling}
        title="Cancelar siniestro"
        message={
          <>
            ¿Cancelar <strong>{claim.code}</strong>? Queda en el historial y se puede registrar otro en la recepción. Las líneas a cargo de la
            aseguradora en presupuestos en borrador vuelven al dueño.
          </>
        }
        confirmLabel="Cancelar siniestro"
        variant="warning"
        reason={{ label: 'Motivo', field: 'reason' }}
        isLoading={cancel.isPending}
        error={cancel.error}
        onConfirm={(reason) => cancel.mutate(reason ?? '')}
        onClose={() => setCancelling(false)}
      />
    </>
  )
}
