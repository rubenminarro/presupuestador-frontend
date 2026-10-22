import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/components/ui/FormModal'
import { FormField, SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { ClientPicker, type ClientOption } from '@/features/clients/ClientPicker'
import { clientsApi } from '@/features/clients/api'
import { FUEL_LEVELS, receptionsApi, receptionVehicleLabel, type Reception, type ReceptionInput } from '@/features/receptions/api'
import { useServiceCategories } from '@/features/services/api'
import { vehicleDescription, vehicleIdentifier } from '@/features/vehicles/api'
import { compact, nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

interface ReceptionFormModalProps {
  /** null: alta. */
  reception: Reception | null
  onClose: () => void
  onCreated?: (reception: Reception) => void
}

/** Hoy en `YYYY-MM-DD` local (no UTC). */
function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Alta y edición. Al editar, cliente y vehículo quedan fijos (el mecánico edita sin acceso a clientes) y las
 * categorías solo cambian con la recepción `pending` (el backend regenera el checklist).
 */
export function ReceptionFormModal({ reception, onClose, onCreated }: ReceptionFormModalProps) {
  const categories = useServiceCategories()
  const [client, setClient] = useState<ClientOption | null>(null)
  const [vehicleId, setVehicleId] = useState('')
  const [categoryIds, setCategoryIds] = useState<number[]>(reception?.service_categories.map((category) => category.id) ?? [])
  const [receptionDate, setReceptionDate] = useState(reception?.reception_date ?? today())
  const [deliveryDate, setDeliveryDate] = useState(reception?.estimated_delivery_date ?? '')
  const [mileage, setMileage] = useState(toInput(reception?.mileage))
  const [fuelLevel, setFuelLevel] = useState<string>(reception?.fuel.value ?? '')
  const [problem, setProblem] = useState(reception?.problem_description ?? '')
  const [observations, setObservations] = useState(reception?.observations ?? '')
  const categoriesEditable = !reception || reception.status.value === 'pending'

  // Vehículos del cliente elegido (el detalle del cliente los trae con marca y modelo).
  const clientDetail = useQuery({
    queryKey: ['clients', 'detail', client?.id],
    queryFn: () => clientsApi.show(client?.id as number),
    enabled: client !== null,
  })
  const vehicles = clientDetail.data?.vehicles ?? []

  const mutation = useApiMutation(
    () => {
      const body: ReceptionInput = {
        reception_date: receptionDate,
        estimated_delivery_date: nullIfEmpty(deliveryDate),
        mileage: toNumber(mileage),
        ...compact({ fuel_level: nullIfEmpty(fuelLevel) }),
        problem_description: nullIfEmpty(problem),
        observations: nullIfEmpty(observations),
        ...(categoriesEditable && { service_category_ids: categoryIds }),
      }
      return reception
        ? receptionsApi.update(reception.id, body)
        : receptionsApi.create({ ...body, client_id: client?.id ?? null, vehicle_id: toNumber(vehicleId) })
    },
    {
      invalidate: [['receptions']],
      successMessage: reception ? 'Recepción actualizada.' : 'Recepción registrada.',
      onSuccess: (saved) => {
        onClose()
        if (!reception) onCreated?.(saved)
      },
    },
  )
  const errors = validationErrors(mutation.error)
  const categoryErrors = Object.entries(errors)
    .filter(([field]) => field.startsWith('service_category_ids'))
    .flatMap(([, messages]) => messages)

  const toggleCategory = (id: number, checked: boolean) =>
    setCategoryIds((current) => (checked ? [...current, id] : current.filter((value) => value !== id)))

  return (
    <FormModal
      title={reception ? `Editar recepción #${reception.id}` : 'Nueva recepción'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      {reception ? (
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="form-label">Cliente</div>
            <div>{reception.client.full_name}</div>
          </div>
          <div className="col-md-6">
            <div className="form-label">Vehículo</div>
            <div>
              {receptionVehicleLabel(reception.vehicle)}
              <span className="text-secondary ms-1">{[reception.vehicle.brand, reception.vehicle.model].filter(Boolean).join(' ')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-6">
            <ClientPicker
              required
              value={client}
              onChange={(option) => {
                setClient(option)
                setVehicleId('')
              }}
              error={errors.client_id}
            />
          </div>
          <div className="col-md-6">
            <SelectField
              label="Vehículo"
              name="vehicle_id"
              required
              disabled={!client || clientDetail.isFetching}
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
              errors={errors}
              hint={client && !clientDetail.isFetching && vehicles.length === 0 ? 'El cliente no tiene vehículos registrados.' : undefined}
            >
              <option value="">{client ? 'Seleccione un vehículo' : 'Primero elija el cliente'}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleIdentifier(vehicle)} · {vehicleDescription(vehicle)}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
      )}

      <FormField label="Categorías de servicio" required error={categoryErrors.length ? categoryErrors : undefined}
        hint={categoriesEditable ? 'Definen los ítems del checklist.' : 'No se cambian una vez procesada la recepción.'}>
        <div>
          {categories.data?.map((category) => (
            <label key={category.id} className="form-check form-check-inline">
              <input
                type="checkbox"
                className="form-check-input"
                disabled={!categoriesEditable}
                checked={categoryIds.includes(category.id)}
                onChange={(event) => toggleCategory(category.id, event.target.checked)}
              />
              <span className="form-check-label">{category.name}</span>
            </label>
          ))}
        </div>
      </FormField>

      <div className="row">
        <div className="col-md-3">
          <TextField
            label="Fecha de ingreso"
            name="reception_date"
            type="date"
            required
            value={receptionDate}
            onChange={(event) => setReceptionDate(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-3">
          <TextField
            label="Entrega estimada"
            name="estimated_delivery_date"
            type="date"
            min={receptionDate || undefined}
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-3">
          <TextField
            label="Kilometraje"
            name="mileage"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={mileage}
            onChange={(event) => setMileage(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-3">
          <SelectField label="Combustible" name="fuel_level" value={fuelLevel} onChange={(event) => setFuelLevel(event.target.value)} errors={errors}>
            {!reception && <option value="">Sin dato</option>}
            {Object.entries(FUEL_LEVELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <TextareaField
        label="Problema informado"
        name="problem_description"
        rows={2}
        maxLength={500}
        value={problem}
        onChange={(event) => setProblem(event.target.value)}
        errors={errors}
      />
      <TextareaField
        label="Observaciones"
        name="observations"
        rows={2}
        maxLength={500}
        value={observations}
        onChange={(event) => setObservations(event.target.value)}
        errors={errors}
      />
    </FormModal>
  )
}
