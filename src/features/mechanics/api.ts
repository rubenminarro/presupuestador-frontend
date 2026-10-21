import type { StatusMap } from '@/components/ui/StatusBadge'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type MechanicStatus = 'active' | 'inactive' | 'on_leave'

/** `MechanicResource`; el detalle suma `notes`. El usuario vinculado no trae su id. */
export interface Mechanic {
  id: number
  employee_code: string
  user?: { name: string; full_name: string; email: string }
  specialty: string | null
  hire_date: string | null
  hour_cost: string | null
  commission_percentage: string | null
  status: { value: MechanicStatus; label: string }
  notes?: string | null
  created_at: string
}

export interface MechanicInput {
  user_id?: number
  employee_code?: string
  specialty?: string
  hire_date?: string
  hour_cost?: number
  commission_percentage?: number
  status?: MechanicStatus
  notes?: string
}

export const MECHANIC_STATUS: StatusMap = {
  active: { label: 'Activo', color: 'green' },
  on_leave: { label: 'En licencia', color: 'yellow' },
  inactive: { label: 'Inactivo', color: 'secondary' },
}

export const mechanicsApi = {
  list: (params: ListParams) => getPage<Mechanic>('/mechanics', params),
  show: (id: number) => getData<Mechanic>(`/mechanics/${id}`),
  create: (body: MechanicInput) => postData<Mechanic>('/mechanics', body),
  update: (id: number, body: MechanicInput) => patchData<Mechanic>(`/mechanics/${id}`, body),
  remove: (id: number) => deleteData(`/mechanics/${id}`),
}
