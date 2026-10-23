import { useQuery } from '@tanstack/react-query'
import type { StatusMap } from '@/components/ui/StatusBadge'
import { deleteData, getData, getWithMeta, patchData, postData } from '@/services/api'
import type { ListParams, Pagination } from '@/types/api'

export type MaintenanceStatus = 'unknown' | 'ok' | 'due_soon' | 'overdue'

/** `MaintenancePlanResource`: vence por km, por días o lo que ocurra primero. */
export interface MaintenancePlan {
  id: number
  name: string
  description: string | null
  service?: { id: number; code: string; name: string } | null
  service_id: number | null
  interval_km: number | null
  interval_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MaintenancePlanInput {
  name: string
  description: string | null
  /** Completar una OT con este servicio registra el mantenimiento. Al editar se omite si no cambia (puede estar eliminado). */
  service_id?: number | null
  /** Al menos uno de los dos intervalos. */
  interval_km: number | null
  interval_days: number | null
  is_active: boolean
}

/** Estado de un plan en un vehículo (`MaintenanceService::present`). Intervalos efectivos: propios o del plan. */
export interface VehicleMaintenance {
  maintenance_plan_id: number
  plan: string
  service_id: number | null
  is_active: boolean
  interval_km: number | null
  interval_days: number | null
  is_custom_interval: boolean
  last_done_at: string | null
  last_done_mileage: number | null
  work_order_id: number | null
  next_due_at: string | null
  next_due_mileage: number | null
  status: { value: MaintenanceStatus; label: string }
  /** Negativos: vencido. */
  remaining_km: number | null
  remaining_days: number | null
  notes: string | null
}

export interface CurrentMileage {
  mileage: number | null
  /** true: última lectura + promedio de km/día desde entonces. */
  estimated: boolean
  daily_average: number | null
  last_reading_at: string | null
}

export interface MaintenanceAlert extends VehicleMaintenance {
  vehicle: { id: number; plate: string | null; estimated_mileage: number | null }
  client: { id: number; full_name: string; phone: string | null; email: string | null } | null
}

export const MAINTENANCE_STATUS: StatusMap = {
  unknown: { label: 'Sin registro', color: 'secondary' },
  ok: { label: 'Al día', color: 'green' },
  due_soon: { label: 'Por vencer', color: 'yellow' },
  overdue: { label: 'Vencido', color: 'red' },
}

export const maintenanceApi = {
  /** Sin paginar, por nombre. */
  plans: (params: ListParams) => getData<MaintenancePlan[]>('/maintenance-plans', params),
  createPlan: (body: MaintenancePlanInput) => postData<MaintenancePlan>('/maintenance-plans', body),
  updatePlan: (id: number, body: MaintenancePlanInput) => patchData<MaintenancePlan>(`/maintenance-plans/${id}`, body),
  removePlan: (id: number) => deleteData(`/maintenance-plans/${id}`),
  forVehicle: (vehicleId: number) =>
    getData<{ current_mileage: CurrentMileage; maintenances: VehicleMaintenance[] }>(`/vehicles/${vehicleId}/maintenances`),
  /** Mantenimiento hecho (en otro taller o carga inicial); fecha no futura ni anterior al último registro. */
  record: (vehicleId: number, body: { maintenance_plan_id: number; done_at: string; mileage: number | null; notes: string | null }) =>
    postData<VehicleMaintenance>(`/vehicles/${vehicleId}/maintenances`, body),
  /** Intervalos propios del vehículo; null vuelve a los del plan. */
  configure: (vehicleId: number, planId: number, body: { interval_km: number | null; interval_days: number | null; notes: string | null }) =>
    patchData<VehicleMaintenance>(`/vehicles/${vehicleId}/maintenances/${planId}`, body),
  alerts: (params: ListParams) =>
    getWithMeta<MaintenanceAlert[], { pagination: Pagination; counts: { overdue: number; due_soon: number } }>('/maintenance/alerts', params),
}

/** "cada 10.000 km o 180 días", lo que ocurra primero. */
export function intervalLabel(km: number | null, days: number | null): string {
  const parts = [km ? `${new Intl.NumberFormat('es-PY').format(km)} km` : null, days ? `${days} días` : null].filter(Boolean)
  return parts.length ? `cada ${parts.join(' o ')}` : '—'
}

export function useMaintenancePlans(enabled = true) {
  return useQuery({ queryKey: ['maintenance-plans'], queryFn: () => maintenanceApi.plans({}), enabled })
}
