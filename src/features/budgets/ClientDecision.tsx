import { useState } from 'react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { FormModal } from '@/components/ui/FormModal'
import type { Budget, BudgetClientAcceptance, BudgetDecisionInput } from '@/features/budgets/api'
import { CLIENT_DECISION_CHANNELS, type ClientDecisionChannel } from '@/features/work-orders/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import { nullIfEmpty } from '@/lib/forms'
import { validationErrors } from '@/services/api'

/**
 * Respuesta del cliente al presupuesto (E5): medio, contacto y notas, todos opcionales. Sin datos se registra igual
 * quién y cuándo. Cada respuesta queda en el historial y no se modifica.
 */
export function ClientDecisionModal({
  budget,
  decision,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: {
  budget: Budget
  decision: 'approve' | 'reject'
  isSubmitting: boolean
  error: unknown
  onSubmit: (decision: BudgetDecisionInput) => void
  onClose: () => void
}) {
  const [channel, setChannel] = useState<ClientDecisionChannel | ''>('')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')
  const approving = decision === 'approve'
  const errors = validationErrors(error)

  return (
    <FormModal
      title={`${approving ? 'Aprobación' : 'Rechazo'} del cliente · ${budget.code}`}
      onClose={onClose}
      onSubmit={() => onSubmit({ channel: channel === '' ? null : channel, contact: nullIfEmpty(contact), notes: nullIfEmpty(notes) })}
      isSubmitting={isSubmitting}
      submitLabel={approving ? 'Registrar aprobación' : 'Registrar rechazo'}
    >
      <p className="text-secondary">
        {approving
          ? 'El cliente aceptó el presupuesto: queda listo para generar la orden de trabajo.'
          : 'El cliente no aceptó el presupuesto. Se puede reabrir como borrador.'}{' '}
        La respuesta queda registrada en el historial del presupuesto.
      </p>
      <SelectField
        label="Medio de la respuesta"
        name="channel"
        value={channel}
        onChange={(event) => setChannel(event.target.value as ClientDecisionChannel | '')}
        errors={errors}
      >
        <option value="">Sin indicar</option>
        {Object.entries(CLIENT_DECISION_CHANNELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Contacto"
        name="contact"
        maxLength={150}
        value={contact}
        onChange={(event) => setContact(event.target.value)}
        errors={errors}
        hint="Quién respondió o por dónde (opcional)."
      />
      <TextareaField
        label={approving ? 'Notas' : 'Motivo del rechazo'}
        name="notes"
        rows={2}
        maxLength={500}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        errors={errors}
        hint="Opcional; al menos 3 caracteres si se completa."
      />
    </FormModal>
  )
}

const COLUMNS: Column<BudgetClientAcceptance>[] = [
  {
    key: 'kind',
    header: 'Respuesta',
    render: (acceptance) => (
      <span className={`badge ${acceptance.kind.value === 'rejection' ? 'bg-red-lt' : 'bg-green-lt'}`}>{acceptance.kind.label}</span>
    ),
  },
  {
    key: 'decided',
    header: 'Registrada',
    className: 'text-nowrap',
    render: (acceptance) => (
      <>
        {formatDateTime(acceptance.decided_at)}
        {acceptance.decided_by && <div className="small text-secondary">{acceptance.decided_by.name}</div>}
      </>
    ),
  },
  {
    key: 'channel',
    header: 'Medio',
    render: (acceptance) => (
      <>
        {acceptance.channel?.label ?? '—'}
        {acceptance.contact && <div className="small text-secondary">{acceptance.contact}</div>}
      </>
    ),
  },
  { key: 'notes', header: 'Notas', render: (acceptance) => acceptance.notes ?? '—' },
  {
    key: 'owner_amount',
    header: 'A cargo del cliente (sin IVA)',
    className: 'text-end text-nowrap',
    render: (acceptance) => formatMoney(acceptance.owner_amount),
  },
]

/** Historial de respuestas del cliente, en orden. */
export function ClientAcceptancesCard({ acceptances }: { acceptances: BudgetClientAcceptance[] }) {
  return (
    <div className="mt-3">
      <DataTable title="Respuestas del cliente" columns={COLUMNS} rows={acceptances} rowKey={(acceptance) => acceptance.id} />
    </div>
  )
}
