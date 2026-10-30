import type { Vehicle } from '@/features/vehicles/api'
import { nullIfEmpty } from '@/lib/forms'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

/** `ClientKind` del backend: persona o empresa (M1). */
export type ClientKind = 'person' | 'company'

export const CLIENT_KIND_LABELS: Record<ClientKind, string> = {
  person: 'Persona',
  company: 'Empresa',
}

/**
 * `ClientResource` (listado). Una persona trae nombre y apellido (`business_name` en null); una empresa, la razón
 * social (`first_name` y `last_name` en null). Para mostrarlo, siempre `display_name`.
 */
export interface ClientSummary {
  id: number
  kind: { value: ClientKind; label: string }
  document_number: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  display_name: string
  phone: string
  email: string
  address: string | null
  notifications_enabled: boolean
  notes: string | null
}

/** `ShowClientResource`: con vehículos (marca y modelo cargados). */
export interface Client extends ClientSummary {
  created_at: string
  updated_at: string
  vehicles: Vehicle[]
}

/** Valores del formulario de cliente (texto tal cual se escribe). */
export interface ClientFormValues {
  kind: ClientKind
  document_number: string
  first_name: string
  last_name: string
  business_name: string
  email: string
  phone: string
  address: string
  notifications_enabled: boolean
  notes: string
}

/** Cuerpo del alta y la edición: solo los campos del tipo elegido (el backend prohíbe los del otro). */
export type ClientInput = {
  kind: ClientKind
  document_number: string
  email: string
  phone: string
  /** null la vacía. */
  address: string | null
  notifications_enabled: boolean
  /** null las vacía. */
  notes: string | null
} & ({ first_name: string; last_name: string } | { business_name: string })

/**
 * Arma el cuerpo del formulario. Los obligatorios van siempre (vacíos, el backend responde 422 en el campo); los del
 * otro tipo no se envían (al editar, el backend rechaza nombre y apellido en null); el email va en minúsculas, como
 * lo exige el backend.
 */
export function clientInput(values: ClientFormValues): ClientInput {
  const common = {
    kind: values.kind,
    document_number: values.document_number.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    address: nullIfEmpty(values.address),
    notifications_enabled: values.notifications_enabled,
    notes: nullIfEmpty(values.notes),
  }

  return values.kind === 'company'
    ? { ...common, business_name: values.business_name.trim() }
    : { ...common, first_name: values.first_name.trim(), last_name: values.last_name.trim() }
}

export const clientsApi = {
  list: (params: ListParams) => getPage<ClientSummary>('/clients', params),
  show: (id: number) => getData<Client>(`/clients/${id}`),
  create: (body: ClientInput) => postData<Client>('/clients', body),
  update: (id: number, body: ClientInput) => patchData<Client>(`/clients/${id}`, body),
  remove: (id: number) => deleteData(`/clients/${id}`),
}
