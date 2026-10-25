import type { StatusMap } from '@/components/ui/StatusBadge'
import type { Mechanic } from '@/features/mechanics/api'
import { photosFormData, type FuelLevel, type Photo, type Reception } from '@/features/receptions/api'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type DiagnosticStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Severity = Priority
export type DiagnosticItemStatus = 'pending' | 'ok' | 'observation' | 'repair_required' | 'replace_required' | 'not_applicable'

/** `DiagnosticResource` (listado): enums como texto, sin label. */
export interface DiagnosticSummary {
  id: number
  reception_id: number
  mechanic_id: number | null
  customer_complaint: string | null
  diagnosis: string | null
  recommendation: string | null
  priority: Priority
  status: DiagnosticStatus
  requires_parts: boolean
  requires_repair: boolean
  diagnosed_at: string | null
  reception?: {
    reception_date: string
    estimated_delivery_date: string | null
    mileage: number | null
    fuel: { value: FuelLevel | null; label: string | null }
    client: { id: number; full_name: string } | null
    vehicle: { id: number; plate: string | null; brand: string | null; model: string | null } | null
  }
  mechanic?: { id: number; name: string; first_name: string; last_name: string }
}

export interface DiagnosticItemPhoto extends Photo {
  diagnostic_item_id: number
}

export interface DiagnosticItem {
  id: number
  diagnostic_id: number
  title: string
  description: string | null
  severity: Severity
  status: DiagnosticItemStatus
  requires_repair: boolean
  requires_replacement: boolean
  /** Referencia, sin IVA. */
  estimated_cost: string | null
  /** Minutos. */
  estimated_time: number | null
  recommendation: string | null
  diagnostic_item_template_id: number | null
  /** Entrada del catálogo de la que se copió (`null`: ítem libre); `deleted`: se eliminó del catálogo después. */
  template?: { id: number; code: string; title: string; deleted: boolean } | null
  photos?: DiagnosticItemPhoto[]
}

/** `ShowDiagnosticResource`: con la recepción (detalle), el mecánico e ítems con fotos. */
export interface Diagnostic extends Omit<DiagnosticSummary, 'reception' | 'mechanic'> {
  reception?: Reception
  mechanic?: Mechanic | null
  items?: DiagnosticItem[]
  created_at: string
  updated_at: string
}

export interface DiagnosticInput {
  reception_id?: number
  mechanic_id?: number | null
  customer_complaint: string | null
  diagnosis: string | null
  recommendation: string | null
  /** Sin null (columna NOT NULL): se omite si no se elige. */
  priority?: Priority
  status?: DiagnosticStatus
  requires_parts: boolean
  requires_repair: boolean
}

export interface DiagnosticItemInput {
  diagnostic_id?: number
  /** Solo en el alta: ítem elegido del catálogo (el backend completa lo que no se envía). */
  diagnostic_item_template_id?: number | null
  /** Solo en el alta de un ítem libre: lo agrega también al catálogo (`diagnostic-item-templates.store`). */
  save_as_template?: boolean
  title: string
  description: string | null
  severity: string
  status: string
  requires_repair: boolean
  requires_replacement: boolean
  estimated_cost: number | null
  estimated_time: number | null
  recommendation: string | null
}

export const DIAGNOSTIC_STATUS: StatusMap = {
  pending: { label: 'Pendiente', color: 'yellow' },
  in_progress: { label: 'En proceso', color: 'blue' },
  completed: { label: 'Terminado', color: 'green' },
  cancelled: { label: 'Cancelado', color: 'secondary' },
}

/** Pendiente o en proceso: admite ítems y fotos (terminado o cancelado no; se puede volver a "en proceso"). */
export function isDiagnosticOpen(status: DiagnosticStatus): boolean {
  return status === 'pending' || status === 'in_progress'
}

export const PRIORITY: StatusMap = {
  low: { label: 'Baja', color: 'secondary' },
  medium: { label: 'Media', color: 'azure' },
  high: { label: 'Alta', color: 'orange' },
  critical: { label: 'Crítica', color: 'red' },
}

export const SEVERITY: StatusMap = PRIORITY

export const DIAGNOSTIC_ITEM_STATUS: StatusMap = {
  pending: { label: 'Pendiente', color: 'secondary' },
  ok: { label: 'OK', color: 'green' },
  observation: { label: 'Observación', color: 'yellow' },
  repair_required: { label: 'Requiere reparación', color: 'orange' },
  replace_required: { label: 'Requiere reemplazo', color: 'red' },
  not_applicable: { label: 'No aplica', color: 'secondary' },
}

export const diagnosticsApi = {
  list: (params: ListParams) => getPage<DiagnosticSummary>('/diagnostics', params),
  show: (id: number) => getData<Diagnostic>(`/diagnostics/${id}`),
  create: (body: DiagnosticInput) => postData<Diagnostic>('/diagnostics', body),
  update: (id: number, body: DiagnosticInput) => patchData<Diagnostic>(`/diagnostics/${id}`, body),
  remove: (id: number) => deleteData(`/diagnostics/${id}`),
  createItem: (body: DiagnosticItemInput) => postData<DiagnosticItem>('/diagnostic-items', body),
  updateItem: (id: number, body: DiagnosticItemInput) => patchData<DiagnosticItem>(`/diagnostic-items/${id}`, body),
  removeItem: (id: number) => deleteData(`/diagnostic-items/${id}`),
  uploadItemPhotos: (itemId: number, files: File[], description: string | null) =>
    postData<DiagnosticItemPhoto[]>(`/diagnostic-items/${itemId}/photos`, photosFormData(files, description)),
  updateItemPhoto: (itemId: number, photoId: number, description: string | null) =>
    patchData<DiagnosticItemPhoto>(`/diagnostic-items/${itemId}/photos/${photoId}`, { description }),
  removeItemPhoto: (itemId: number, photoId: number) => deleteData(`/diagnostic-items/${itemId}/photos/${photoId}`),
}
