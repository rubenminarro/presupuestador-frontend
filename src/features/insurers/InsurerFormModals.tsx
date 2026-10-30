import { useState } from 'react'
import { FormField, TextareaField, TextField } from '@/components/ui/FormField'
import { FormModal } from '@/components/ui/FormModal'
import { ClientPicker, type ClientOption } from '@/features/clients/ClientPicker'
import { insurerInput, insurersApi, type Insurer, type InsurerFormValues } from '@/features/insurers/api'
import { nullIfEmpty, toInput } from '@/lib/forms'
import { toast } from '@/lib/toast'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

const INVALIDATE = [['insurers'], ['clients']]

/**
 * Alta de aseguradora (M2): vinculada a un cliente empresa nuevo (sus datos se cargan aquí) o existente (buscador de
 * empresas). Razón social, RUC, email y teléfono quedan en el cliente: se editan desde la ficha del cliente.
 */
export function NewInsurerModal({ onClose, onSaved }: { onClose: () => void; onSaved: (insurer: Insurer) => void }) {
  const [values, setValues] = useState<InsurerFormValues>({
    mode: 'new',
    client_id: null,
    business_name: '',
    document_number: '',
    email: '',
    phone: '',
    address: '',
    payment_term_days: '',
    notes: '',
  })
  const [client, setClient] = useState<ClientOption | null>(null)
  const set = <K extends keyof InsurerFormValues>(key: K, value: InsurerFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const mutation = useApiMutation(() => insurersApi.create(insurerInput({ ...values, client_id: client?.id ?? null })), {
    invalidate: INVALIDATE,
    successMessage: 'Aseguradora creada.',
    onSuccess: ({ data, meta }) => {
      // El cliente existente conserva sus avisos (decisión D): el backend lo advierte.
      meta?.warnings?.forEach((warning) => toast.warning(warning))
      onClose()
      onSaved(data)
    },
  })
  const errors = validationErrors(mutation.error)
  const isNew = values.mode === 'new'

  return (
    <FormModal title="Nueva aseguradora" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} size="lg">
      <FormField label="Cliente de la aseguradora" hint="Es el destinatario de sus facturas: siempre un cliente empresa.">
        <div className="form-selectgroup" role="radiogroup" aria-label="Cliente de la aseguradora">
          {(['new', 'existing'] as const).map((mode) => (
            <label key={mode} className="form-selectgroup-item">
              <input
                type="radio"
                name="mode"
                value={mode}
                className="form-selectgroup-input"
                checked={values.mode === mode}
                onChange={() => set('mode', mode)}
              />
              <span className="form-selectgroup-label">{mode === 'new' ? 'Cliente nuevo' : 'Cliente existente'}</span>
            </label>
          ))}
        </div>
      </FormField>
      {isNew ? (
        <div className="row">
          <div className="col-md-12">
            <TextField
              label="Razón social"
              name="client.business_name"
              required
              autoFocus
              maxLength={150}
              value={values.business_name}
              onChange={(event) => set('business_name', event.target.value)}
              errors={errors}
            />
          </div>
          <div className="col-md-6">
            <TextField
              label="RUC"
              name="client.document_number"
              required
              maxLength={20}
              value={values.document_number}
              onChange={(event) => set('document_number', event.target.value)}
              errors={errors}
            />
          </div>
          <div className="col-md-6">
            <TextField
              label="Teléfono"
              name="client.phone"
              type="tel"
              required
              value={values.phone}
              onChange={(event) => set('phone', event.target.value)}
              errors={errors}
            />
          </div>
          <div className="col-md-6">
            <TextField
              label="Email"
              name="client.email"
              type="email"
              required
              maxLength={50}
              value={values.email}
              onChange={(event) => set('email', event.target.value)}
              errors={errors}
            />
          </div>
          <div className="col-md-6">
            <TextField
              label="Dirección"
              name="client.address"
              maxLength={255}
              value={values.address}
              onChange={(event) => set('address', event.target.value)}
              errors={errors}
            />
          </div>
          <div className="col-12 small text-secondary mb-3">El cliente nuevo nace sin avisos por email (se pueden activar desde su ficha).</div>
        </div>
      ) : (
        <ClientPicker label="Cliente empresa" kind="company" required value={client} onChange={setClient} error={errors?.client_id} />
      )}
      <TermAndNotes values={values} set={set} errors={errors} />
    </FormModal>
  )
}

/** Edición: plazo de pago y notas (los datos de la empresa se editan en su cliente). */
export function EditInsurerModal({ insurer, onClose }: { insurer: Insurer; onClose: () => void }) {
  const [paymentTermDays, setPaymentTermDays] = useState(toInput(insurer.payment_term_days))
  const [notes, setNotes] = useState(insurer.notes ?? '')
  const mutation = useApiMutation(
    () =>
      insurersApi.update(insurer.id, {
        payment_term_days: paymentTermDays.trim() === '' ? null : Number(paymentTermDays),
        notes: nullIfEmpty(notes),
      }),
    { invalidate: INVALIDATE, successMessage: 'Aseguradora actualizada.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Editar ${insurer.code}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      <TermAndNotes
        values={{ payment_term_days: paymentTermDays, notes }}
        set={(key, value) => (key === 'payment_term_days' ? setPaymentTermDays(value) : setNotes(value))}
        errors={errors}
      />
    </FormModal>
  )
}

function TermAndNotes({
  values,
  set,
  errors,
}: {
  values: Pick<InsurerFormValues, 'payment_term_days' | 'notes'>
  set: (key: 'payment_term_days' | 'notes', value: string) => void
  errors: ReturnType<typeof validationErrors>
}) {
  return (
    <>
      <TextField
        label="Plazo de pago (días)"
        name="payment_term_days"
        type="number"
        inputMode="numeric"
        min={0}
        max={365}
        value={values.payment_term_days}
        onChange={(event) => set('payment_term_days', event.target.value)}
        errors={errors}
        hint="Vencimiento de sus facturas a crédito; vacío: 30 días."
      />
      <TextareaField
        label="Notas"
        name="notes"
        rows={2}
        maxLength={1000}
        value={values.notes}
        onChange={(event) => set('notes', event.target.value)}
        errors={errors}
      />
    </>
  )
}
