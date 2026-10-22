import type { StatusMap } from '@/components/ui/StatusBadge'
import type { FuelLevel, ReceptionStatus } from '@/features/receptions/api'
import { downloadFile, getData, getPage, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type DeliveryStatus = 'delivered' | 'cancelled'

/** `VehicleDeliveryResource` (listado). */
export interface DeliverySummary {
  id: number
  /** `ENT-000001`. */
  delivery_number: string
  status: { value: DeliveryStatus; label: string }
  reception_id: number
  vehicle_id: number
  /** null en vehículos sin chapa. */
  plate?: string | null
  client_id: number
  client_name?: string | null
  delivered_at: string
  final_mileage: number
  received_by_name: string
  created_at: string
}

/** `ShowVehicleDeliveryResource`. */
export interface Delivery {
  id: number
  delivery_number: string
  status: { value: DeliveryStatus; label: string }
  reception?: { id: number; status: ReceptionStatus; reception_date: string; mileage: number | null }
  vehicle?: { id: number; plate: string | null; mileage: number | null }
  client?: { id: number; full_name: string; document_number: string }
  delivered_at: string
  delivered_by: number
  final_mileage: number
  fuel_level: FuelLevel | null
  received_by: { name: string; document: string }
  customer_accepted: boolean
  signature_url: string | null
  observations: string | null
  cancelled_at: string | null
  cancelled_by: number | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export interface DeliveryInput {
  final_mileage: number | null
  /** Vacío: no se informa. */
  fuel_level: FuelLevel | ''
  received_by_name: string
  received_by_document: string
  customer_accepted: boolean
  signature: File | null
  observations: string | null
}

export const DELIVERY_STATUS: StatusMap = {
  delivered: { label: 'Entregado', color: 'teal' },
  cancelled: { label: 'Anulado', color: 'secondary' },
}

/** Multipart por la firma (imagen opcional); los vacíos no se mandan. */
function deliveryFormData(body: DeliveryInput): FormData {
  const form = new FormData()
  if (body.final_mileage !== null) form.append('final_mileage', String(body.final_mileage))
  if (body.fuel_level) form.append('fuel_level', body.fuel_level)
  form.append('received_by_name', body.received_by_name)
  form.append('received_by_document', body.received_by_document)
  if (body.customer_accepted) form.append('customer_accepted', '1')
  if (body.signature) form.append('signature', body.signature)
  if (body.observations) form.append('observations', body.observations)
  return form
}

export const deliveriesApi = {
  list: (params: ListParams) => getPage<DeliverySummary>('/vehicle-deliveries', params),
  show: (id: number) => getData<Delivery>(`/vehicle-deliveries/${id}`),
  /** Exige OT completadas con factura emitida (y pagada si es al contado). */
  create: (receptionId: number, body: DeliveryInput) => postData<Delivery>(`/receptions/${receptionId}/delivery`, deliveryFormData(body)),
  cancel: (id: number, reason: string) => postData<Delivery>(`/vehicle-deliveries/${id}/cancel`, { reason }),
  pdf: (delivery: Pick<Delivery, 'id' | 'delivery_number'>) =>
    downloadFile(`/vehicle-deliveries/${delivery.id}/pdf`, `entrega-${delivery.delivery_number}.pdf`),
}
