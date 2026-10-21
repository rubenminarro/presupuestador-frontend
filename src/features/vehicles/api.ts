import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type VehicleColor = 'white' | 'black' | 'gray' | 'silver' | 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'brown' | 'beige'
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'flex' | 'glp' | 'gnv'
export type TransmissionType = 'manual' | 'automatic' | 'semi-automatic'

/** `VehicleResource` / `ShowVehicleResource` (con cliente, marca y modelo cargados). */
export interface Vehicle {
  id: number
  chassis: string | null
  plate: string | null
  no_plate: boolean
  year: number | null
  color: VehicleColor | null
  engine_number: string | null
  mileage: number | null
  fuel_type: FuelType | null
  transmission: TransmissionType | null
  notes: string | null
  client?: {
    id: number
    first_name: string
    last_name: string
    document_number: string
    phone: string
    email: string
    full_name: string
  }
  brand?: { id: number; name: string }
  vehicle_model?: { id: number; name: string }
  created_at: string
  updated_at: string
}

export interface VehicleInput {
  client_id?: number
  brand_id?: number
  vehicle_model_id?: number
  no_plate: boolean
  plate?: string
  chassis?: string
  year?: number
  color?: VehicleColor
  engine_number?: string
  mileage?: number
  fuel_type?: FuelType
  transmission?: TransmissionType
  notes?: string
}

// Etiquetas de los enums del backend (VehicleColor, FuelType, TransmissionType).
export const COLOR_LABELS: Record<VehicleColor, string> = {
  white: 'Blanco',
  black: 'Negro',
  gray: 'Gris',
  silver: 'Plata / Plateado',
  red: 'Rojo',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarillo',
  orange: 'Naranja',
  brown: 'Marrón / Café',
  beige: 'Beige',
}

export const FUEL_LABELS: Record<FuelType, string> = {
  gasoline: 'Gasolina',
  diesel: 'Diésel',
  electric: 'Eléctrico',
  hybrid: 'Híbrido',
  flex: 'Flex (Etanol/Gasolina)',
  glp: 'Gas LP',
  gnv: 'Gas Natural',
}

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  manual: 'Manual',
  automatic: 'Automática',
  'semi-automatic': 'Semi-automática',
}

/** Identificación corta: chapa, o chasis si no tiene chapa. */
export function vehicleIdentifier(vehicle: Pick<Vehicle, 'plate' | 'chassis' | 'no_plate'>): string {
  if (!vehicle.no_plate && vehicle.plate) return vehicle.plate
  return vehicle.chassis ? `Sin chapa · ${vehicle.chassis}` : 'Sin chapa'
}

export function vehicleDescription(vehicle: Vehicle): string {
  return [vehicle.brand?.name, vehicle.vehicle_model?.name, vehicle.year].filter(Boolean).join(' ')
}

export const vehiclesApi = {
  list: (params: ListParams) => getPage<Vehicle>('/vehicles', params),
  show: (id: number) => getData<Vehicle>(`/vehicles/${id}`),
  /** Alta general: el cliente va en el body. */
  create: (body: VehicleInput) => postData<Vehicle>('/vehicles', body),
  /** Alta desde la ficha del cliente: el backend toma el cliente de la URL. */
  createForClient: (clientId: number, body: VehicleInput) => postData<Vehicle>(`/clients/${clientId}/vehicles`, body),
  update: (id: number, body: VehicleInput) => patchData<Vehicle>(`/vehicles/${id}`, body),
  remove: (id: number) => deleteData(`/vehicles/${id}`),
}
