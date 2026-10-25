import type { StatusMap } from '@/components/ui/StatusBadge'
import type { Severity } from '@/features/diagnostics/api'
import type { ServiceCategory } from '@/features/services/api'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type DiagnosticItemTemplateStatus = 'active' | 'inactive'

/** `DiagnosticItemTemplateResource`: valores que se copian al ítem del diagnóstico al elegirlo. */
export interface DiagnosticItemTemplate {
  id: number
  code: string
  title: string
  description: string | null
  service_category_id: number | null
  severity: Severity
  requires_repair: boolean
  requires_replacement: boolean
  /** Minutos. */
  estimated_time: number | null
  recommendation: string | null
  status: { value: DiagnosticItemTemplateStatus; label: string }
  category: ServiceCategory | null
  created_at: string
  updated_at: string
}

/** Opcionales en null se vacían; título y severidad en null → 422 del backend. */
export interface DiagnosticItemTemplateInput {
  service_category_id: number | null
  title: string
  description: string | null
  severity: string
  requires_repair: boolean
  requires_replacement: boolean
  estimated_time: number | null
  recommendation: string | null
}

export const DIAGNOSTIC_ITEM_TEMPLATE_STATUS: StatusMap = {
  active: { label: 'Activo', color: 'green' },
  inactive: { label: 'Inactivo', color: 'secondary' },
}

export const diagnosticItemTemplatesApi = {
  list: (params: ListParams) => getPage<DiagnosticItemTemplate>('/diagnostic-item-templates', params),
  show: (id: number) => getData<DiagnosticItemTemplate>(`/diagnostic-item-templates/${id}`),
  create: (body: DiagnosticItemTemplateInput) => postData<DiagnosticItemTemplate>('/diagnostic-item-templates', body),
  update: (id: number, body: DiagnosticItemTemplateInput) => patchData<DiagnosticItemTemplate>(`/diagnostic-item-templates/${id}`, body),
  activate: (id: number) => postData<DiagnosticItemTemplate>(`/diagnostic-item-templates/${id}/activate`),
  deactivate: (id: number) => postData<DiagnosticItemTemplate>(`/diagnostic-item-templates/${id}/deactivate`),
  remove: (id: number) => deleteData(`/diagnostic-item-templates/${id}`),
}
