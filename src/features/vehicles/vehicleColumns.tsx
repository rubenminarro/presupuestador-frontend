import { Link } from 'react-router-dom'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import type { Column } from '@/components/ui/DataTable'
import { IconButton } from '@/components/ui/IconButton'
import { COLOR_LABELS, vehicleDescription, vehicleIdentifier, type Vehicle } from '@/features/vehicles/api'

interface VehicleColumnsOptions {
  showClient: boolean
  canOpenClient?: boolean
  onEdit?: (vehicle: Vehicle) => void
  onDelete?: (vehicle: Vehicle) => void
}

/** Columnas compartidas por el listado general y la ficha del cliente. */
export function vehicleColumns({ showClient, canOpenClient, onEdit, onDelete }: VehicleColumnsOptions): Column<Vehicle>[] {
  const columns: Column<Vehicle>[] = [
    { key: 'plate', header: 'Chapa', className: 'text-nowrap', render: (vehicle) => <strong>{vehicleIdentifier(vehicle)}</strong> },
    { key: 'vehicle', header: 'Vehículo', render: (vehicle) => vehicleDescription(vehicle) || '—' },
    { key: 'color', header: 'Color', render: (vehicle) => (vehicle.color ? COLOR_LABELS[vehicle.color] : '—') },
  ]

  if (showClient) {
    columns.push({
      key: 'client',
      header: 'Cliente',
      render: (vehicle) => {
        if (!vehicle.client) return '—'
        return canOpenClient ? <Link to={`/clients/${vehicle.client.id}`}>{vehicle.client.full_name}</Link> : vehicle.client.full_name
      },
    })
  }

  if (onEdit || onDelete) {
    columns.push({
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (vehicle) => (
        <>
          {onEdit && <IconButton label={`Editar ${vehicleIdentifier(vehicle)}`} icon={IconPencil} onClick={() => onEdit(vehicle)} />}
          {onDelete && (
            <IconButton label={`Eliminar ${vehicleIdentifier(vehicle)}`} icon={IconTrash} variant="danger" onClick={() => onDelete(vehicle)} />
          )}
        </>
      ),
    })
  }

  return columns
}
