import { useQuery } from '@tanstack/react-query'
import type { StatusMap } from '@/components/ui/StatusBadge'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export interface ServiceCategory {
  id: number
  code: string
  name: string
  services_count?: number
}

export type ServiceStatus = 'active' | 'inactive'

/** `ServiceResource`; el detalle (`ShowServiceResource`) suma `description`. */
export interface Service {
  id: number
  code: string
  name: string
  description?: string | null
  service_category_id: number
  /** Sin IVA, decimal como string. */
  standard_price: string
  estimated_hours: string | null
  status: { value: ServiceStatus; label: string }
  category: ServiceCategory | null
  created_at: string
  updated_at: string
}

export interface ServiceInput {
  service_category_id: number
  name: string
  description?: string
  standard_price: number
  estimated_hours?: number
}

export const SERVICE_STATUS: StatusMap = {
  active: { label: 'Activo', color: 'green' },
  inactive: { label: 'Inactivo', color: 'secondary' },
}

export const servicesApi = {
  list: (params: ListParams) => getPage<Service>('/services', params),
  show: (id: number) => getData<Service>(`/services/${id}`),
  create: (body: ServiceInput) => postData<Service>('/services', body),
  update: (id: number, body: Partial<ServiceInput>) => patchData<Service>(`/services/${id}`, body),
  activate: (id: number) => postData<Service>(`/services/${id}/activate`),
  deactivate: (id: number) => postData<Service>(`/services/${id}/deactivate`),
  remove: (id: number) => deleteData(`/services/${id}`),
}

export function useServiceCategories() {
  return useQuery({
    queryKey: ['service-categories'],
    queryFn: () => getData<ServiceCategory[]>('/service-categories'),
    staleTime: 5 * 60_000,
  })
}
