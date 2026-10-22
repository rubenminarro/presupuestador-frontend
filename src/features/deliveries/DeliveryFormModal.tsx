import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { FormField, SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { deliveriesApi, type Delivery } from '@/features/deliveries/api'
import { FUEL_LEVELS, receptionVehicleLabel, type FuelLevel, type Reception } from '@/features/receptions/api'
import { cx } from '@/lib/cx'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/**
 * Entrega del vehículo: km final (no menor al de la recepción), quién retira, conformidad obligatoria y firma
 * opcional. Los requisitos de OT y facturas los valida el backend.
 */
export function DeliveryFormModal({ reception, onClose, onCreated }: { reception: Reception; onClose: () => void; onCreated: (delivery: Delivery) => void }) {
  const [mileage, setMileage] = useState(toInput(reception.mileage))
  const [fuel, setFuel] = useState<FuelLevel | ''>('')
  const [name, setName] = useState(reception.client.full_name)
  const [document, setDocument] = useState(reception.client.document_number)
  const [accepted, setAccepted] = useState(false)
  const [signature, setSignature] = useState<File | null>(null)
  const [observations, setObservations] = useState('')

  const mutation = useApiMutation(
    () =>
      deliveriesApi.create(reception.id, {
        final_mileage: toNumber(mileage),
        fuel_level: fuel,
        received_by_name: name.trim(),
        received_by_document: document.trim(),
        customer_accepted: accepted,
        signature,
        observations: nullIfEmpty(observations),
      }),
    {
      // La recepción pasa a "Entregado" y el kilometraje del vehículo avanza.
      invalidate: [['vehicle-deliveries'], ['receptions'], ['vehicles']],
      successMessage: 'Entrega registrada.',
      onSuccess: (delivery) => {
        onClose()
        onCreated(delivery)
      },
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={`Entregar ${receptionVehicleLabel(reception.vehicle)}`}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      submitLabel="Registrar entrega"
      size="lg"
    >
      <p className="text-secondary">
        Requiere las órdenes de trabajo cerradas, cada OT completada con factura emitida y, si es al contado, pagada.
      </p>
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Kilometraje de entrega"
            name="final_mileage"
            required
            type="number"
            inputMode="numeric"
            min={reception.mileage ?? 0}
            step={1}
            value={mileage}
            onChange={(event) => setMileage(event.target.value)}
            errors={errors}
            hint={reception.mileage === null ? undefined : `Al ingresar: ${new Intl.NumberFormat('es-PY').format(reception.mileage)} km.`}
          />
        </div>
        <div className="col-md-6">
          <SelectField label="Combustible" name="fuel_level" value={fuel} onChange={(event) => setFuel(event.target.value as FuelLevel | '')} errors={errors}>
            <option value="">Sin informar</option>
            {Object.entries(FUEL_LEVELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-8">
          <TextField
            label="Retira"
            name="received_by_name"
            required
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="Documento"
            name="received_by_document"
            required
            maxLength={30}
            value={document}
            onChange={(event) => setDocument(event.target.value)}
            errors={errors}
          />
        </div>
      </div>
      <FormField label="Firma" htmlFor="delivery-signature" hint="Opcional: imagen jpg, png o webp de hasta 2 MB." error={errors.signature}>
        <input
          id="delivery-signature"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={cx('form-control', errors.signature && 'is-invalid')}
          onChange={(event) => setSignature(event.target.files?.[0] ?? null)}
        />
      </FormField>
      <TextareaField
        label="Observaciones"
        name="observations"
        rows={2}
        maxLength={1000}
        value={observations}
        onChange={(event) => setObservations(event.target.value)}
        errors={errors}
      />
      <div className="mb-0">
        <label className="form-check">
          <input
            type="checkbox"
            name="customer_accepted"
            className={cx('form-check-input', errors.customer_accepted && 'is-invalid')}
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span className="form-check-label required">El cliente revisó el vehículo y da su conformidad</span>
        </label>
        {errors.customer_accepted?.map((message) => (
          <div key={message} className="invalid-feedback d-block">
            {message}
          </div>
        ))}
      </div>
    </FormModal>
  )
}
