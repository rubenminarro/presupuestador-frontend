import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconShieldExclamation } from '@tabler/icons-react'
import { TextareaField } from '@/components/ui/FormField'
import { FormModal } from '@/components/ui/FormModal'
import { useAuth } from '@/features/auth/useAuth'
import { hasInsurerItems, type Budget } from '@/features/budgets/api'
import type { Claim } from '@/features/claims/api'
import { internalExceptionsApi } from '@/features/internal-exceptions/api'
import { formatDateTime } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/**
 * "Iniciar sin autorización" (M7): la otorga el jefe de taller sobre un presupuesto enviado o aprobado, con líneas de la
 * aseguradora, siniestro abierto y sin autorización vigente. La consume el alta de la OT. No cambia lo que paga nadie.
 */
export function StartWithoutAuthorization({ budget, claim }: { budget: Budget; claim: Claim | null }) {
  const { can } = useAuth()
  const [granting, setGranting] = useState(false)
  const applies =
    hasInsurerItems(budget) &&
    claim?.status.value === 'open' &&
    !budget.insurer_authorization &&
    (budget.status === 'sent' || budget.status === 'approved')

  const available = useQuery({
    queryKey: ['internal-exceptions', 'start', budget.id],
    queryFn: () => internalExceptionsApi.availableToStart(budget.id),
    enabled: applies && can('internal-exceptions.index'),
  })

  if (!applies || !can('internal-exceptions.index')) return null

  const exception = available.data

  return (
    <div className="card mt-3">
      <div className="card-body d-flex align-items-start gap-2">
        <IconShieldExclamation size={20} className="text-secondary flex-shrink-0" aria-hidden="true" />
        <div className="flex-fill small">
          {exception ? (
            <>
              <strong>Excepción "iniciar sin autorización"</strong> otorgada {formatDateTime(exception.granted_at)}
              {exception.granted_by && ` por ${exception.granted_by.name}`}: {exception.reason}
              <div className="text-secondary">Se usa al generar la orden de trabajo.</div>
            </>
          ) : (
            <span className="text-secondary">Sin autorización de la aseguradora la OT no se genera, salvo con una excepción interna.</span>
          )}
        </div>
        {!exception && can('internal-exceptions.grant') && (
          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => setGranting(true)}>
            Otorgar excepción
          </button>
        )}
      </div>
      {granting && <GrantModal budget={budget} onClose={() => setGranting(false)} />}
    </div>
  )
}

function GrantModal({ budget, onClose }: { budget: Budget; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const mutation = useApiMutation(
    () => internalExceptionsApi.create({ type: 'start_without_authorization', subject_id: budget.id, reason: reason.trim() }),
    { invalidate: [['internal-exceptions']], successMessage: 'Excepción otorgada: la OT se puede generar sin la autorización.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Iniciar sin autorización · ${budget.code}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Otorgar">
      <p className="text-secondary">
        Permite generar la orden de trabajo antes de que la aseguradora autorice. No cambia lo que paga la aseguradora ni lo
        aceptado por el dueño: el reparto se controla al cerrar la OT.
      </p>
      <TextareaField
        label="Motivo"
        name="reason"
        required
        rows={3}
        minLength={10}
        maxLength={1000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        errors={errors}
        hint="Entre 10 y 1000 caracteres; queda registrado con su nombre."
      />
    </FormModal>
  )
}
