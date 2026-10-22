import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField, SwitchField, TextareaField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { DIAGNOSTIC_STATUS, diagnosticsApi, PRIORITY, type Diagnostic, type DiagnosticInput, type DiagnosticStatus, type Priority } from '@/features/diagnostics/api'
import { useActiveMechanics } from '@/features/mechanics/api'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

interface DiagnosticFormModalProps {
  /** null: alta sobre `receptionId`. */
  diagnostic: Diagnostic | null
  receptionId?: number
  /** Queja del cliente sugerida en el alta (el problema informado en la recepción). */
  defaultComplaint?: string | null
  onClose: () => void
  onCreated?: (diagnostic: Diagnostic) => void
}

export function DiagnosticFormModal({ diagnostic, receptionId, defaultComplaint, onClose, onCreated }: DiagnosticFormModalProps) {
  const { can } = useAuth()
  // Sin `mechanics.index` (p. ej. el mecánico) no se elige ni se cambia el mecánico.
  const canPickMechanic = can('mechanics.index')
  const mechanics = useActiveMechanics(canPickMechanic)
  const [mechanicId, setMechanicId] = useState(toInput(diagnostic?.mechanic_id))
  const [complaint, setComplaint] = useState(diagnostic ? (diagnostic.customer_complaint ?? '') : (defaultComplaint ?? ''))
  const [diagnosis, setDiagnosis] = useState(diagnostic?.diagnosis ?? '')
  const [recommendation, setRecommendation] = useState(diagnostic?.recommendation ?? '')
  const [priority, setPriority] = useState<string>(diagnostic?.priority ?? 'medium')
  const [status, setStatus] = useState<string>(diagnostic?.status ?? 'pending')
  const [requiresParts, setRequiresParts] = useState(diagnostic?.requires_parts ?? false)
  const [requiresRepair, setRequiresRepair] = useState(diagnostic?.requires_repair ?? false)

  // Al editar se conserva el mecánico actual aunque ya no esté activo.
  const mechanicOptions = [...(mechanics.data ?? [])]
  if (diagnostic?.mechanic && !mechanicOptions.some((mechanic) => mechanic.id === diagnostic.mechanic?.id)) {
    mechanicOptions.unshift(diagnostic.mechanic)
  }

  const mutation = useApiMutation(
    () => {
      const body: DiagnosticInput = {
        customer_complaint: nullIfEmpty(complaint),
        diagnosis: nullIfEmpty(diagnosis),
        recommendation: nullIfEmpty(recommendation),
        priority: priority as Priority,
        requires_parts: requiresParts,
        requires_repair: requiresRepair,
        ...(canPickMechanic && { mechanic_id: toNumber(mechanicId) }),
      }
      return diagnostic
        ? diagnosticsApi.update(diagnostic.id, { ...body, status: status as DiagnosticStatus })
        : diagnosticsApi.create({ ...body, reception_id: receptionId })
    },
    {
      invalidate: [['diagnostics']],
      successMessage: diagnostic ? 'Diagnóstico actualizado.' : 'Diagnóstico registrado.',
      onSuccess: (saved) => {
        onClose()
        if (!diagnostic) onCreated?.(saved)
      },
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={diagnostic ? `Editar diagnóstico #${diagnostic.id}` : 'Nuevo diagnóstico'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        {canPickMechanic && (
          <div className="col-md-6">
            <SelectField label="Mecánico" name="mechanic_id" value={mechanicId} onChange={(event) => setMechanicId(event.target.value)} errors={errors}>
              <option value="">Sin asignar</option>
              {mechanicOptions.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>
                  {mechanic.user?.full_name ?? mechanic.employee_code}
                </option>
              ))}
            </SelectField>
          </div>
        )}
        <div className="col-md-3">
          <SelectField label="Prioridad" name="priority" required value={priority} onChange={(event) => setPriority(event.target.value)} errors={errors}>
            {Object.entries(PRIORITY).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        {diagnostic && (
          <div className="col-md-3">
            <SelectField label="Estado" name="status" required value={status} onChange={(event) => setStatus(event.target.value)} errors={errors}>
              {Object.entries(DIAGNOSTIC_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
        )}
      </div>
      {errors.reception_id?.map((message) => (
        <div key={message} className="alert alert-danger py-2">
          {message}
        </div>
      ))}
      <TextareaField
        label="Queja del cliente"
        name="customer_complaint"
        rows={2}
        maxLength={1000}
        value={complaint}
        onChange={(event) => setComplaint(event.target.value)}
        errors={errors}
      />
      <TextareaField
        label="Diagnóstico"
        name="diagnosis"
        rows={3}
        maxLength={1000}
        value={diagnosis}
        onChange={(event) => setDiagnosis(event.target.value)}
        errors={errors}
      />
      <TextareaField
        label="Recomendación"
        name="recommendation"
        rows={2}
        maxLength={1000}
        value={recommendation}
        onChange={(event) => setRecommendation(event.target.value)}
        errors={errors}
      />
      <div className="row">
        <div className="col-sm-6">
          <SwitchField label="Requiere repuestos" name="requires_parts" checked={requiresParts} onChange={setRequiresParts} errors={errors} />
        </div>
        <div className="col-sm-6">
          <SwitchField label="Requiere reparación" name="requires_repair" checked={requiresRepair} onChange={setRequiresRepair} errors={errors} />
        </div>
      </div>
    </FormModal>
  )
}
