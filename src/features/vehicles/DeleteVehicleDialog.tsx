import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { vehicleDescription, vehicleIdentifier, vehiclesApi, type Vehicle } from '@/features/vehicles/api'

export function DeleteVehicleDialog({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  return (
    <DeleteDialog
      title="Eliminar vehículo"
      message={
        <>
          ¿Eliminar el vehículo <strong>{vehicleIdentifier(vehicle)}</strong> ({vehicleDescription(vehicle) || 'sin datos'})? Su chapa y
          chasis quedan libres para otro registro.
        </>
      }
      onDelete={() => vehiclesApi.remove(vehicle.id)}
      invalidate={[['vehicles'], ['clients']]}
      successMessage="Vehículo eliminado."
      onClose={onClose}
    />
  )
}
