import type { StatusMap } from '@/components/ui/StatusBadge'
import { getData, postData } from '@/services/api'

export type CommissionStatus = 'pending' | 'settled'

interface CommissionMechanic {
  id: number
  employee_code: string
  full_name: string
}

/** Línea congelada al completar la OT. Importes sin IVA (2 decimales). */
export interface CommissionLine {
  id: number
  work_order_id: number
  work_order_code: string
  completed_at: string
  work_order_item_id: number
  description: string
  item_total: string
  share_percentage: string
  commission_percentage: string
  commission_amount: string
  settled_at: string | null
}

/** Respuesta de `GET /mechanics/{mechanic}/commissions`; los totales respetan el filtro de estado. */
export interface MechanicCommissions {
  mechanic: CommissionMechanic
  period: { date_from: string; date_to: string }
  total_commission: string
  total_pending: string
  total_settled: string
  lines: CommissionLine[]
}

export interface CommissionSettlement {
  mechanic: CommissionMechanic
  period: { date_from: string; date_to: string }
  settled_count: number
  settled_total: string
  settled_at: string
}

/** Sin fechas, el backend toma el mes en curso. */
export interface CommissionParams {
  date_from?: string
  date_to?: string
  status?: CommissionStatus | ''
}

export const COMMISSION_STATUS: StatusMap = {
  pending: { label: 'Pendiente', color: 'yellow' },
  settled: { label: 'Liquidada', color: 'green' },
}

export const commissionsApi = {
  list: (mechanicId: number, params: CommissionParams) =>
    getData<MechanicCommissions>(`/mechanics/${mechanicId}/commissions`, { ...params }),
  settle: (mechanicId: number, period: { date_from: string; date_to: string }) =>
    postData<CommissionSettlement>(`/mechanics/${mechanicId}/commissions/settle`, period),
}
