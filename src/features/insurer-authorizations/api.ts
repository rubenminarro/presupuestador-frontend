import type { StatusMap } from '@/components/ui/StatusBadge'
import type { ClaimDocument } from '@/features/claims/api'
import type { ClientDecisionChannel } from '@/features/work-orders/api'
import { nullIfEmpty } from '@/lib/forms'
import { getData, postData } from '@/services/api'

export type AuthorizationStatus = 'current' | 'superseded' | 'invalidated'
export type AuthorizationResult = 'full' | 'partial' | 'rejected'
export type AuthorizationDecision = 'authorized' | 'partial' | 'not_covered'

/** Línea de `InsurerAuthorizationResource`: copia del ítem presupuestado y lo autorizado, sin IVA. */
export interface InsurerAuthorizationItem {
  id: number
  /** null si el ítem se borró al reabrir el presupuesto (la línea conserva su copia). */
  budget_item_id: number | null
  description: string
  budgeted_quantity: string
  budgeted_total: string
  decision: { value: AuthorizationDecision; label: string }
  authorized_quantity: string
  authorized_unit_price: string
  authorized_total: string
  notes: string | null
}

/** `InsurerAuthorizationResource` (M6): versionada e inmutable; importes sin IVA. */
export interface InsurerAuthorization {
  id: number
  budget_id: number
  claim_id: number
  version: number
  status: { value: AuthorizationStatus; label: string }
  result: { value: AuthorizationResult; label: string }
  authorization_number: string | null
  decided_at: string | null
  channel: { value: ClientDecisionChannel; label: string }
  adjuster_name: string | null
  authorized_total: string
  notes: string | null
  registered_by?: { id: number; name: string } | null
  superseded_by_id: number | null
  superseded_at: string | null
  invalidated_at: string | null
  invalidation_reason: string | null
  items?: InsurerAuthorizationItem[]
  documents?: ClaimDocument[]
  created_at: string
}

export const AUTHORIZATION_STATUS: StatusMap = {
  current: { label: 'Vigente', color: 'green' },
  superseded: { label: 'Sustituida', color: 'secondary' },
  invalidated: { label: 'Invalidada', color: 'orange' },
}

export const AUTHORIZATION_RESULT: StatusMap = {
  full: { label: 'Total', color: 'green' },
  partial: { label: 'Parcial', color: 'yellow' },
  rejected: { label: 'Rechazada', color: 'red' },
}

export const AUTHORIZATION_DECISIONS: Record<AuthorizationDecision, string> = {
  authorized: 'Autorizada',
  partial: 'Parcial',
  not_covered: 'No cubierta',
}

/** Una fila del formulario por cada línea a cargo de la aseguradora (texto tal cual se escribe). */
export interface AuthorizationRow {
  budget_item_id: number
  decision: AuthorizationDecision | ''
  /** Solo en una parcial: importe autorizado (en la unidad elegida) y, opcional, la cantidad. */
  authorized_total: string
  authorized_quantity: string
  notes: string
}

export interface AuthorizationHeader {
  /** Sin elegir: null (el backend responde 422 en el campo; V2 sigue abierta). */
  amounts_include_tax: boolean | null
  decided_at: string
  channel: ClientDecisionChannel | ''
  authorization_number: string
  adjuster_name: string
  notes: string
  document_ids: number[]
}

/**
 * Cuerpo de `POST budgets/{id}/insurer-authorizations`: una línea por ítem de la aseguradora. El importe y la cantidad
 * solo van en una parcial; los documentos, solo si se eligió alguno. Topes, IVA y evidencia los valida el backend.
 */
export function authorizationInput(header: AuthorizationHeader, rows: AuthorizationRow[]) {
  return {
    amounts_include_tax: header.amounts_include_tax,
    decided_at: header.decided_at,
    channel: header.channel,
    authorization_number: nullIfEmpty(header.authorization_number),
    adjuster_name: nullIfEmpty(header.adjuster_name),
    notes: nullIfEmpty(header.notes),
    items: rows.map((row) => ({
      budget_item_id: row.budget_item_id,
      decision: row.decision,
      ...(row.decision === 'partial' && {
        authorized_total: row.authorized_total.trim() === '' ? null : row.authorized_total.trim(),
        authorized_quantity: row.authorized_quantity.trim() === '' ? null : row.authorized_quantity.trim(),
      }),
      notes: nullIfEmpty(row.notes),
    })),
    ...(header.document_ids.length > 0 && { document_ids: header.document_ids }),
  }
}

export const insurerAuthorizationsApi = {
  list: (budgetId: number) => getData<InsurerAuthorization[]>(`/budgets/${budgetId}/insurer-authorizations`),
  create: (budgetId: number, body: ReturnType<typeof authorizationInput>) =>
    postData<InsurerAuthorization>(`/budgets/${budgetId}/insurer-authorizations`, body),
}
