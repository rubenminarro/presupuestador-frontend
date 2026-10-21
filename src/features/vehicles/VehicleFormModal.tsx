import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField, SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import { useAllBrands, useVehicleModelsByBrand } from '@/features/brands/api'
import { ClientPicker, type ClientOption } from '@/features/clients/ClientPicker'
import {
  COLOR_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  vehiclesApi,
  type FuelType,
  type TransmissionType,
  type Vehicle,
  type VehicleColor,
  type VehicleInput,
} from '@/features/vehicles/api'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

interface VehicleFormModalProps {
  vehicle: Vehicle | null
  /** Alta desde la ficha del cliente: el cliente queda fijo (lo toma la URL del backend). */
  fixedClient?: ClientOption
  onClose: () => void
}

const CURRENT_YEAR = new Date().getFullYear()

export function VehicleFormModal({ vehicle, fixedClient, onClose }: VehicleFormModalProps) {
  const brands = useAllBrands()

  const [client, setClient] = useState<ClientOption | null>(
    fixedClient ??
      (vehicle?.client
        ? { id: vehicle.client.id, name: vehicle.client.full_name, detail: `${vehicle.client.document_number} · ${vehicle.client.phone}` }
        : null),
  )
  const [brandId, setBrandId] = useState(toInput(vehicle?.brand?.id))
  const [modelId, setModelId] = useState(toInput(vehicle?.vehicle_model?.id))
  const [noPlate, setNoPlate] = useState(vehicle?.no_plate ?? false)
  const [plate, setPlate] = useState(vehicle?.plate ?? '')
  const [chassis, setChassis] = useState(vehicle?.chassis ?? '')
  const [year, setYear] = useState(toInput(vehicle?.year))
  const [color, setColor] = useState<VehicleColor | ''>(vehicle?.color ?? '')
  const [engineNumber, setEngineNumber] = useState(vehicle?.engine_number ?? '')
  const [mileage, setMileage] = useState(toInput(vehicle?.mileage))
  const [fuelType, setFuelType] = useState<FuelType | ''>(vehicle?.fuel_type ?? '')
  const [transmission, setTransmission] = useState<TransmissionType | ''>(vehicle?.transmission ?? '')
  const [notes, setNotes] = useState(vehicle?.notes ?? '')

  const models = useVehicleModelsByBrand(toNumber(brandId))

  const mutation = useApiMutation(
    () => {
      // Los opcionales vacíos van como null: al editar, así se vacían.
      const body: VehicleInput = {
        client_id: client?.id ?? null,
        brand_id: toNumber(brandId),
        vehicle_model_id: toNumber(modelId),
        no_plate: noPlate,
        plate: noPlate ? null : nullIfEmpty(plate.toUpperCase()),
        chassis: nullIfEmpty(chassis),
        year: toNumber(year),
        color: color || null,
        engine_number: nullIfEmpty(engineNumber),
        mileage: toNumber(mileage),
        fuel_type: fuelType || null,
        transmission: transmission || null,
        notes: nullIfEmpty(notes),
      }
      if (vehicle) return vehiclesApi.update(vehicle.id, body)
      return fixedClient ? vehiclesApi.createForClient(fixedClient.id, body) : vehiclesApi.create(body)
    },
    {
      invalidate: [['vehicles'], ['clients']],
      successMessage: vehicle ? 'Vehículo actualizado.' : 'Vehículo registrado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={vehicle ? 'Editar vehículo' : 'Nuevo vehículo'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      {fixedClient ? (
        <div className="mb-3">
          <div className="form-label">Cliente</div>
          <div className="form-control-plaintext">{fixedClient.name}</div>
        </div>
      ) : (
        <ClientPicker value={client} onChange={setClient} error={errors.client_id} required />
      )}

      <div className="row">
        <div className="col-md-6">
          <SelectField
            label="Marca"
            name="brand_id"
            required
            value={brandId}
            onChange={(event) => {
              setBrandId(event.target.value)
              setModelId('')
            }}
            errors={errors}
            disabled={brands.isPending}
          >
            <option value="">{brands.isPending ? 'Cargando…' : 'Seleccione una marca'}</option>
            {brands.data?.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-6">
          <SelectField
            label="Modelo"
            name="vehicle_model_id"
            required
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            errors={errors}
            disabled={!brandId || models.isFetching}
          >
            <option value="">{!brandId ? 'Elija primero la marca' : models.isFetching ? 'Cargando…' : 'Seleccione un modelo'}</option>
            {models.data?.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <SwitchField label="El vehículo no tiene chapa" name="no_plate" checked={noPlate} onChange={setNoPlate} errors={errors} />

      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Chapa"
            name="plate"
            required={!noPlate}
            disabled={noPlate}
            maxLength={20}
            value={noPlate ? '' : plate}
            onChange={(event) => setPlate(event.target.value.toUpperCase())}
            errors={errors}
            hint="Letras, números y guiones."
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Chasis"
            name="chassis"
            required={noPlate}
            maxLength={50}
            value={chassis}
            onChange={(event) => setChassis(event.target.value)}
            errors={errors}
            hint={noPlate ? 'Obligatorio cuando no tiene chapa.' : undefined}
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="Año"
            name="year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={CURRENT_YEAR}
            value={year}
            onChange={(event) => setYear(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <SelectField label="Color" name="color" value={color} onChange={(event) => setColor(event.target.value as VehicleColor | '')} errors={errors}>
            <option value="">Sin especificar</option>
            {Object.entries(COLOR_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-4">
          <TextField
            label="Kilometraje"
            name="mileage"
            type="number"
            inputMode="numeric"
            min={0}
            value={mileage}
            onChange={(event) => setMileage(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <SelectField
            label="Combustible"
            name="fuel_type"
            value={fuelType}
            onChange={(event) => setFuelType(event.target.value as FuelType | '')}
            errors={errors}
          >
            <option value="">Sin especificar</option>
            {Object.entries(FUEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-4">
          <SelectField
            label="Transmisión"
            name="transmission"
            value={transmission}
            onChange={(event) => setTransmission(event.target.value as TransmissionType | '')}
            errors={errors}
          >
            <option value="">Sin especificar</option>
            {Object.entries(TRANSMISSION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-4">
          <TextField
            label="N.º de motor"
            name="engine_number"
            maxLength={30}
            value={engineNumber}
            onChange={(event) => setEngineNumber(event.target.value)}
            errors={errors}
            hint="Letras y números, 5 a 30."
          />
        </div>
      </div>
      <TextareaField
        label="Notas"
        name="notes"
        rows={2}
        maxLength={500}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        errors={errors}
      />
    </FormModal>
  )
}
