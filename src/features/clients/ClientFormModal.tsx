import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import { clientsApi, type Client } from '@/features/clients/api'
import { compact } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

interface ClientFormModalProps {
  client: Client | null
  onClose: () => void
  onSaved?: (client: Client) => void
}

export function ClientFormModal({ client, onClose, onSaved }: ClientFormModalProps) {
  const [documentNumber, setDocumentNumber] = useState(client?.document_number ?? '')
  const [firstName, setFirstName] = useState(client?.first_name ?? '')
  const [lastName, setLastName] = useState(client?.last_name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [notificationsEnabled, setNotificationsEnabled] = useState(client?.notifications_enabled ?? true)
  const [notes, setNotes] = useState(client?.notes ?? '')

  const mutation = useApiMutation(
    () => {
      const body = {
        ...compact({
          document_number: documentNumber.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          // El backend exige el email en minúsculas.
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          notes,
        }),
        notifications_enabled: notificationsEnabled,
      }
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

  return (
    <FormModal
      title={client ? 'Editar cliente' : 'Nuevo cliente'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Nombre"
            name="first_name"
            required
            autoFocus
            maxLength={100}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Apellido"
            name="last_name"
            required
            maxLength={100}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="RUC / CI"
            name="document_number"
            required
            maxLength={20}
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
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
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            errors={errors}
            hint="8 a 15 dígitos, opcionalmente con + al inicio."
          />
        </div>
        <div className="col-md-12">
          <TextField
            label="Email"
            name="email"
            type="email"
            required
            maxLength={50}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            errors={errors}
          />
        </div>
      </div>
      <SwitchField
        label="Enviar avisos por email (presupuestos, vehículo listo, vencimientos)"
        name="notifications_enabled"
        checked={notificationsEnabled}
        onChange={setNotificationsEnabled}
        errors={errors}
      />
      <TextareaField
        label="Notas"
        name="notes"
        rows={2}
        maxLength={1000}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        errors={errors}
      />
    </FormModal>
  )
}
