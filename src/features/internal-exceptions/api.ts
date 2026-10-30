import { getPage, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type InternalExceptionType = 'start_without_authorization' | 'workshop_absorption'

export const INTERNAL_EXCEPTION_TYPES: Record<InternalExceptionType, string> = {
  start_without_authorization: 'Iniciar sin autorización',
  workshop_absorption: 'Absorción del taller',
}

/** Documento de referencia (`budget` o `work_order`, y quien la consumió). */
export interface ExceptionDocument {
  type: string
  id: number
  code: string | null
}

/**
 * `InternalExceptionResource` (M7): inmutable; solo se registra una vez la operación que la consumió. Ninguna sube lo
 * que paga la aseguradora ni lo aceptado por el dueño.
 */
export interface InternalException {
  id: number
  type: { value: InternalExceptionType; label: string }
  subject: ExceptionDocument
  /** Solo en una absorción del taller (sin IVA). */
  amount: string | null
  reason: string
  granted_by: { id: number; name: string } | null
  granted_at: string
  consumed_at: string | null
  consumed_by: ExceptionDocument | null
  created_at: string
}

export interface InternalExceptionInput {
  type: InternalExceptionType
  subject_id: number
  amount?: number | null
  reason: string
}

export const internalExceptionsApi = {
  list: (params: ListParams) => getPage<InternalException>('/internal-exceptions', params),
  create: (body: InternalExceptionInput) => postData<InternalException>('/internal-exceptions', body),
  /** "Iniciar sin autorización" del presupuesto, todavía sin usar (la consume el alta de la OT). */
  availableToStart: (budgetId: number) =>
    getPage<InternalException>('/internal-exceptions', {
      type: 'start_without_authorization',
      subject_type: 'budget',
      subject_id: budgetId,
      consumed: 0,
      per_page: 1,
    }).then((page) => page.items[0] ?? null),
}
