import type { StatusMap } from '@/components/ui/StatusBadge'
import type { CheckListType } from '@/features/checklists/api'
import type { VehicleColor } from '@/features/vehicles/api'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type ReceptionStatus = 'pending' | 'in_progress' | 'repair' | 'completed' | 'delivered' | 'cancelled'
export type FuelLevel = 'empty' | 'quarter' | 'half' | 'three_quarters' | 'full'
export type CheckListStatus = 'pending' | 'in_progress' | 'completed'
export type CheckListValue = 'good' | 'bad' | 'na'

export interface ReceptionClient {
  id: number
  full_name: string
  document_number: string
  phone: string
  email: string | null
}

export interface ReceptionVehicle {
  id: number
  plate: string | null
  chassis: string | null
  brand: string | null
  model: string | null
  year?: number | null
  color: { value: VehicleColor | null; label: string | null }
  engine_number?: string | null
}

/** `ReceptionResource` (listado). Fechas `Y-m-d`. */
export interface ReceptionSummary {
  id: number
  client_id: number
  vehicle_id: number
  reception_date: string
  estimated_delivery_date: string | null
  client: ReceptionClient
  vehicle: ReceptionVehicle
  problem_description: string | null
  status: { value: ReceptionStatus; label: string }
}

/** `ShowReceptionResource`. */
export interface Reception extends ReceptionSummary {
  observations: string | null
  mileage: number | null
  fuel: { value: FuelLevel | null; label: string | null }
  cancelled_at: string | null
  cancelled_by: number | null
  cancellation_reason: string | null
  created_by: { id: number; name: string } | null
  approved_by: { id: number | null; name: string | null } | null
  service_categories: { id: number; name: string }[]
  /** Para `reception-check-lists/{id}`. */
  check_list: { id: number; status: CheckListStatus } | null
  /** Siniestro vigente (M3): solo con `claims.show`; `null` si no tiene. */
  claim?: {
    id: number
    code: string
    claim_number: string | null
    status: { value: 'open' | 'closed' | 'cancelled'; label: string }
    insurer: string | null
  } | null
  created_at: string
}

export interface ReceptionInput {
  client_id?: number | null
  vehicle_id?: number | null
  /** Solo editables con la recepción `pending`. */
  service_category_ids?: number[]
  reception_date: string
  estimated_delivery_date: string | null
  mileage: number | null
  /** Sin null (columna NOT NULL): se omite si no se elige (alta: vacío). */
  fuel_level?: string
  problem_description: string | null
  observations: string | null
}

export interface ReceptionCheckListItem {
  id: number
  check_list_item_id: number
  name: string
  type: CheckListType
  /** Llega como 1/0. */
  required: boolean | number
  /** Según el tipo: booleano, número o `good|bad|na`; la base lo guarda como texto. */
  value: string | number | boolean | null
  observation: string | null
}

export interface ReceptionCheckList {
  id: number
  reception_id: number
  status: CheckListStatus
  items: ReceptionCheckListItem[]
}

export interface CheckListItemInput {
  id: number
  value: string | number | boolean | null
  observation: string | null
}

export interface Photo {
  id: number
  original_name: string
  description: string | null
  url: string | null
  created_at: string
}

export const RECEPTION_STATUS: StatusMap = {
  pending: { label: 'Pendiente', color: 'yellow' },
  in_progress: { label: 'En proceso', color: 'blue' },
  repair: { label: 'En reparación', color: 'orange' },
  completed: { label: 'Terminado', color: 'green' },
  delivered: { label: 'Entregado', color: 'teal' },
  cancelled: { label: 'Cancelado', color: 'secondary' },
}

export const CHECKLIST_STATUS: StatusMap = {
  pending: { label: 'Sin completar', color: 'secondary' },
  in_progress: { label: 'En curso', color: 'yellow' },
  completed: { label: 'Completo', color: 'green' },
}

export const FUEL_LEVELS: Record<FuelLevel, string> = {
  empty: 'Vacío',
  quarter: '1/4',
  half: '1/2',
  three_quarters: '3/4',
  full: 'Lleno',
}

export const CHECKLIST_VALUES: Record<CheckListValue, string> = {
  good: 'Bueno',
  bad: 'Malo',
  na: 'No aplica',
}

/** Abierta: admite cambios y trabajos nuevos (`delivered` y `cancelled` son finales). */
export function isReceptionOpen(status: ReceptionStatus): boolean {
  return status !== 'delivered' && status !== 'cancelled'
}

export function receptionVehicleLabel(vehicle: Pick<ReceptionVehicle, 'plate' | 'chassis'>): string {
  return vehicle.plate ?? (vehicle.chassis ? `Sin chapa · ${vehicle.chassis}` : 'Sin chapa')
}

/** Fotos: `photos[i][file]` y `photos[i][description]` en multipart. */
export function photosFormData(files: File[], description: string | null): FormData {
  const form = new FormData()
  files.forEach((file, index) => {
    form.append(`photos[${index}][file]`, file)
    if (description) form.append(`photos[${index}][description]`, description)
  })
  return form
}

export const receptionsApi = {
  list: (params: ListParams) => getPage<ReceptionSummary>('/receptions', params),
  show: (id: number) => getData<Reception>(`/receptions/${id}`),
  create: (body: ReceptionInput) => postData<Reception>('/receptions', body),
  update: (id: number, body: ReceptionInput) => patchData<Reception>(`/receptions/${id}`, body),
  cancel: (id: number, reason: string) => postData<Reception>(`/receptions/${id}/cancel`, { reason }),
  remove: (id: number) => deleteData(`/receptions/${id}`),
  checkList: (id: number) => getData<ReceptionCheckList>(`/reception-check-lists/${id}`),
  updateCheckList: (id: number, items: CheckListItemInput[]) => patchData<ReceptionCheckList>(`/reception-check-lists/${id}`, { items }),
  photos: (id: number) => getData<Photo[]>(`/receptions/${id}/photos`),
  uploadPhotos: (id: number, files: File[], description: string | null) =>
    postData<Photo[]>(`/receptions/${id}/photos`, photosFormData(files, description)),
  updatePhoto: (id: number, photoId: number, description: string | null) =>
    patchData<Photo>(`/receptions/${id}/photos/${photoId}`, { description }),
  removePhoto: (id: number, photoId: number) => deleteData(`/receptions/${id}/photos/${photoId}`),
}
