import type { Vehicle } from '@/features/vehicles/api'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

/** `ClientResource` (listado). */
export interface ClientSummary {
  id: number
  document_number: string
  first_name: string
  last_name: string
  phone: string
  email: string
  notifications_enabled: boolean
  notes: string | null
}

/** `ShowClientResource`: con vehículos (marca y modelo cargados). */
export interface Client extends ClientSummary {
  created_at: string
  updated_at: string
  vehicles: Vehicle[]
}

export interface ClientInput {
  document_number: string
  first_name: string
  last_name: string
  email: string
  phone: string
  notifications_enabled: boolean
  /** null la vacía. */
  notes: string | null
}

export function clientName(client: Pick<ClientSummary, 'first_name' | 'last_name'>): string {
  return `${client.first_name} ${client.last_name}`.trim()
}

export const clientsApi = {
  list: (params: ListParams) => getPage<ClientSummary>('/clients', params),
  show: (id: number) => getData<Client>(`/clients/${id}`),
  create: (body: ClientInput) => postData<Client>('/clients', body),
  update: (id: number, body: ClientInput) => patchData<Client>(`/clients/${id}`, body),
  remove: (id: number) => deleteData(`/clients/${id}`),
}
