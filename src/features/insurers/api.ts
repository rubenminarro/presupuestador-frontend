import type { StatusMap } from '@/components/ui/StatusBadge'
import type { DeductibleBillingMode } from '@/features/claims/api'
import type { Client } from '@/features/clients/api'
import { nullIfEmpty } from '@/lib/forms'
import { deleteData, getData, getPage, patchData, postData, postWithMeta } from '@/services/api'
import type { ListParams } from '@/types/api'

export type InsurerStatus = 'active' | 'inactive'
export type InsurerContactRole = 'claims' | 'billing' | 'adjuster_coordination' | 'other'

/** `InsurerContactResource`. Un solo principal por aseguradora: marcar otro desmarca el anterior. */
export interface InsurerContact {
  id: number
  insurer_id: number
  name: string
  role: { value: InsurerContactRole; label: string }
  phone: string | null
  email: string | null
  is_primary: boolean
  notes: string | null
}

/** `InsurerResource` (listado). Razón social, RUC y contacto son los del cliente empresa vinculado. */
export interface InsurerSummary {
  id: number
  code: string
  status: { value: InsurerStatus; label: string }
  client?: { id: number; display_name: string; document_number: string; email: string; phone: string }
  payment_term_days: number | null
  contacts_count?: number
  created_at: string
}

/** `ShowInsurerResource`: el cliente empresa completo y los contactos. */
export interface Insurer {
  id: number
  code: string
  status: { value: InsurerStatus; label: string }
  client: Client
  payment_term_days: number | null
  /** M10: modalidad del deducible por defecto de sus siniestros; y si el backend permite elegirla. */
  deductible_billing_mode?: { value: DeductibleBillingMode; label: string } | null
  deductible_net_mode_available?: boolean
  notes: string | null
  contacts: InsurerContact[]
  created_by: number | null
  created_at: string
  updated_at: string
}

export const INSURER_STATUS: StatusMap = {
  active: { label: 'Activa', color: 'green' },
  inactive: { label: 'Inactiva', color: 'secondary' },
}

export const INSURER_CONTACT_ROLES: Record<InsurerContactRole, string> = {
  claims: 'Siniestros',
  billing: 'Facturación',
  adjuster_coordination: 'Coordinación de peritos',
  other: 'Otro',
}

/** Valores del formulario de alta: un cliente empresa nuevo o uno existente. */
export interface InsurerFormValues {
  mode: 'new' | 'existing'
  client_id: number | null
  business_name: string
  document_number: string
  email: string
  phone: string
  address: string
  payment_term_days: string
  notes: string
}

/** Cuerpo de `POST insurers`: `client_id` o `client`, nunca los dos (el backend responde 422). */
export type InsurerInput = {
  payment_term_days: number | null
  notes: string | null
} & ({ client_id: number | null } | { client: { business_name: string; document_number: string; email: string; phone: string; address: string | null } })

export function insurerInput(values: InsurerFormValues): InsurerInput {
  const common = {
    payment_term_days: values.payment_term_days.trim() === '' ? null : Number(values.payment_term_days),
    notes: nullIfEmpty(values.notes),
  }

  if (values.mode === 'existing') return { ...common, client_id: values.client_id }

  return {
    ...common,
    client: {
      business_name: values.business_name.trim(),
      document_number: values.document_number.trim(),
      // El backend exige el email en minúsculas, como en el alta de un cliente.
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      address: nullIfEmpty(values.address),
    },
  }
}

export interface InsurerContactInput {
  name: string
  role: InsurerContactRole | ''
  phone: string | null
  email: string | null
  is_primary: boolean
  notes: string | null
}

export const insurersApi = {
  list: (params: ListParams) => getPage<InsurerSummary>('/insurers', params),
  show: (id: number) => getData<Insurer>(`/insurers/${id}`),
  /** `meta.warnings`: avisos sobre el cliente existente (p. ej. sigue recibiendo los avisos de sus vehículos). */
  create: (body: InsurerInput) => postWithMeta<Insurer, { warnings?: string[] }>('/insurers', body),
  update: (id: number, body: { payment_term_days: number | null; notes: string | null; deductible_billing_mode?: DeductibleBillingMode | null }) =>
    patchData<Insurer>(`/insurers/${id}`, body),
  remove: (id: number) => deleteData(`/insurers/${id}`),
  setStatus: (id: number, active: boolean) => postData<Insurer>(`/insurers/${id}/${active ? 'activate' : 'deactivate'}`),
  createContact: (id: number, body: InsurerContactInput) => postData<InsurerContact>(`/insurers/${id}/contacts`, body),
  updateContact: (id: number, contactId: number, body: InsurerContactInput) => patchData<InsurerContact>(`/insurers/${id}/contacts/${contactId}`, body),
  removeContact: (id: number, contactId: number) => deleteData(`/insurers/${id}/contacts/${contactId}`),
}
