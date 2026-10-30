import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { FormField, SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import {
  CLIENT_KIND_LABELS,
  clientInput,
  clientsApi,
  type Client,
  type ClientFormValues,
  type ClientKind,
} from '@/features/clients/api'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

interface ClientFormModalProps {
  client: Client | null
  onClose: () => void
  onSaved?: (client: Client) => void
}

const KINDS: ClientKind[] = ['person', 'company']

export function ClientFormModal({ client, onClose, onSaved }: ClientFormModalProps) {
  const [values, setValues] = useState<ClientFormValues>({
    kind: client?.kind.value ?? 'person',
    document_number: client?.document_number ?? '',
    first_name: client?.first_name ?? '',
    last_name: client?.last_name ?? '',
    business_name: client?.business_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    address: client?.address ?? '',
    notifications_enabled: client?.notifications_enabled ?? true,
    notes: client?.notes ?? '',
  })
  const set = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const mutation = useApiMutation(
    () => {
      const body = clientInput(values)
      return client ? clientsApi.update(client.id, body) : clientsApi.create(body)
    },
    {
      invalidate: [['clients'], ['vehicles']],
      successMessage: client ? 'Cliente actualizado.' : 'Cliente creado.',
      onSuccess: (saved) => {
        onClose()
        onSaved?.(saved)
      },
    },
  )
  const errors = validationErrors(mutation.error)
  const isCompany = values.kind === 'company'

  return (
    <FormModal
      title={client ? 'Editar cliente' : 'Nuevo cliente'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <FormField
        label="Tipo de cliente"
        error={errors?.kind}
        hint={
          client
            ? 'El tipo solo cambia si el cliente no tiene recepciones ni facturas; al cambiarlo se vacían los datos del tipo anterior.'
            : undefined
        }
      >
        <div className="form-selectgroup" role="radiogroup" aria-label="Tipo de cliente">
          {KINDS.map((kind) => (
            <label key={kind} className="form-selectgroup-item">
              <input
                type="radio"
                name="kind"
                value={kind}
                className="form-selectgroup-input"
                checked={values.kind === kind}
                onChange={() => set('kind', kind)}
              />
              <span className="form-selectgroup-label">{CLIENT_KIND_LABELS[kind]}</span>
            </label>
          ))}
        </div>
      </FormField>
      <div className="row">
        {isCompany ? (
          <div className="col-md-12">
            <TextField
              label="Razón social"
              name="business_name"
              required
              autoFocus
              maxLength={150}
              value={values.business_name}
              onChange={(event) => set('business_name', event.target.value)}
              errors={errors}
            />
          </div>
        ) : (
          <>
            <div className="col-md-6">
              <TextField
                label="Nombre"
                name="first_name"
                required
                autoFocus
                maxLength={100}
                value={values.first_name}
                onChange={(event) => set('first_name', event.target.value)}
                errors={errors}
              />
            </div>
            <div className="col-md-6">
              <TextField
                label="Apellido"
                name="last_name"
                required
                maxLength={100}
                value={values.last_name}
                onChange={(event) => set('last_name', event.target.value)}
                errors={errors}
              />
            </div>
          </>
        )}
        <div className="col-md-6">
          <TextField
            label={isCompany ? 'RUC' : 'RUC / CI'}
            name="document_number"
            required
            maxLength={20}
            value={values.document_number}
            onChange={(event) => set('document_number', event.target.value)}
            errors={errors}
            hint="Letras, números y guiones."
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Teléfono"
            name="phone"
            type="tel"
            required
            value={values.phone}
            onChange={(event) => set('phone', event.target.value)}
            errors={errors}
            hint="8 a 15 dígitos, opcionalmente con + al inicio."
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Email"
            name="email"
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
            name="address"
            maxLength={255}
            value={values.address}
            onChange={(event) => set('address', event.target.value)}
            errors={errors}
          />
        </div>
      </div>
      <SwitchField
        label="Enviar avisos por email (presupuestos, vehículo listo, vencimientos)"
        name="notifications_enabled"
        checked={values.notifications_enabled}
        onChange={(checked) => set('notifications_enabled', checked)}
        errors={errors}
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
    </FormModal>
  )
}
