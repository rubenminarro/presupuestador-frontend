import type { StatusMap } from '@/components/ui/StatusBadge'
import type { ReceptionStatus } from '@/features/receptions/api'
import { nullIfEmpty } from '@/lib/forms'
import { deleteData, downloadFile, getData, getPage, isApiError, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type ClaimStatus = 'open' | 'closed' | 'cancelled'
export type ClaimType = 'own' | 'third_party'
export type ClaimDocumentType = 'loss_report' | 'policy' | 'adjuster_report' | 'authorization' | 'photo' | 'other'
/** Modalidad de facturación del deducible (M10). null: rige la regla A (con deducible mayor a 0 no se factura). */
export type DeductibleBillingMode = 'net_of_deductible'

export const DEDUCTIBLE_BILLING_MODES: Record<DeductibleBillingMode, string> = {
  net_of_deductible: 'Neta del deducible',
}

/**
 * El selector de la modalidad se muestra con el interruptor del backend encendido (`deductible_net_mode_available`) o
 * si ya hay una cargada, para poder quitarla.
 */
export function showDeductibleMode(available: boolean | undefined, current: DeductibleBillingMode | null | undefined): boolean {
  return Boolean(available) || Boolean(current)
}

/** `ClaimResource` (listado). `deductible_amount`: null = desconocido, 0 = sin deducible. */
export interface ClaimSummary {
  id: number
  code: string
  status: { value: ClaimStatus; label: string }
  claim_type: { value: ClaimType; label: string }
  claim_number: string | null
  loss_date: string
  insured_name: string | null
  deductible_amount: string | null
  deductible_billing_mode?: { value: DeductibleBillingMode; label: string } | null
  reception_id: number
  plate?: string | null
  insurer?: { id: number; code: string; name: string | null }
  created_at: string
}

/** `ShowClaimResource`. */
export interface Claim {
  id: number
  code: string
  status: { value: ClaimStatus; label: string }
  claim_type: { value: ClaimType; label: string }
  claim_number: string | null
  policy_number: string | null
  loss_date: string
  loss_description: string | null
  reception?: {
    id: number
    status: { value: ReceptionStatus; label: string }
    client: { id: number; display_name: string } | null
    vehicle: { id: number; plate: string | null; brand: string | null; model: string | null } | null
  }
  insurer?: { id: number; code: string; name: string | null; document_number: string | null; status: 'active' | 'inactive' }
  insured: { client_id: number | null; name: string | null; document: string | null; phone: string | null; email: string | null }
  adjuster: { name: string | null; phone: string | null; email: string | null; inspection_scheduled_at: string | null; inspected_at: string | null }
  deductible_amount: string | null
  /** M10: modalidad del deducible (la copia de la aseguradora al abrirse) y si el importe incluye el IVA (null = sin indicar). */
  deductible_billing_mode?: { value: DeductibleBillingMode; label: string } | null
  deductible_includes_tax?: boolean | null
  /** Interruptor `insurer.deductible_net_mode` del backend. */
  deductible_net_mode_available?: boolean
  coverage_notes: string | null
  closed_at: string | null
  cancelled_at: string | null
  cancelled_by?: { id: number; name: string } | null
  cancellation_reason: string | null
  created_by?: { id: number; name: string } | null
  created_at: string
  updated_at: string
}

/** `ClaimDocumentResource`: nunca trae ruta ni URL; se descarga por la API. */
export interface ClaimDocument {
  id: number
  claim_id: number
  /** Evidencia de una autorización de la aseguradora (M6): no se da de baja. */
  insurer_authorization_id: number | null
  type: { value: ClaimDocumentType; label: string }
  original_name: string
  mime: string
  size: number
  sha256: string
  notes: string | null
  uploaded_by?: { id: number; name: string } | null
  created_at: string
}

export const CLAIM_STATUS: StatusMap = {
  open: { label: 'Abierto', color: 'blue' },
  closed: { label: 'Cerrado', color: 'green' },
  cancelled: { label: 'Cancelado', color: 'secondary' },
}

export const CLAIM_TYPES: Record<ClaimType, string> = {
  own: 'Propio',
  third_party: 'De tercero',
}

export const CLAIM_DOCUMENT_TYPES: Record<ClaimDocumentType, string> = {
  loss_report: 'Denuncia',
  policy: 'Póliza',
  adjuster_report: 'Informe del perito',
  authorization: 'Autorización',
  photo: 'Foto',
  other: 'Otro',
}

/** Formatos y tamaño que acepta el backend (provisorio, V8). */
export const CLAIM_DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'
export const CLAIM_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

/** Valores del formulario (texto tal cual se escribe). */
export interface ClaimFormValues {
  insurer_id: number | null
  claim_type: ClaimType
  loss_date: string
  claim_number: string
  policy_number: string
  loss_description: string
  insured_name: string
  insured_document: string
  insured_phone: string
  insured_email: string
  adjuster_name: string
  adjuster_phone: string
  adjuster_email: string
  inspection_scheduled_at: string
  inspected_at: string
  /** Vacío = desconocido; 0 = sin deducible. */
  deductible_amount: string
  /** '' = sin indicar (V15: se elige, sin valor por defecto). */
  deductible_includes_tax: '' | 'true' | 'false'
  /** Solo en la edición (el alta copia la de la aseguradora). */
  deductible_billing_mode: DeductibleBillingMode | ''
  coverage_notes: string
}

/** Campos que cambian igual en el alta y en la edición (vacío → null: se vacía). */
function details(values: ClaimFormValues) {
  return {
    loss_date: values.loss_date,
    claim_number: nullIfEmpty(values.claim_number),
    policy_number: nullIfEmpty(values.policy_number),
    loss_description: nullIfEmpty(values.loss_description),
    insured_document: nullIfEmpty(values.insured_document),
    insured_phone: nullIfEmpty(values.insured_phone),
    insured_email: nullIfEmpty(values.insured_email)?.toLowerCase() ?? null,
    adjuster_name: nullIfEmpty(values.adjuster_name),
    adjuster_phone: nullIfEmpty(values.adjuster_phone),
    adjuster_email: nullIfEmpty(values.adjuster_email)?.toLowerCase() ?? null,
    inspection_scheduled_at: nullIfEmpty(values.inspection_scheduled_at),
    inspected_at: nullIfEmpty(values.inspected_at),
    deductible_amount: values.deductible_amount.trim() === '' ? null : values.deductible_amount.trim(),
    deductible_includes_tax: values.deductible_includes_tax === '' ? null : values.deductible_includes_tax === 'true',
    coverage_notes: nullIfEmpty(values.coverage_notes),
  }
}

/**
 * Alta (`POST claims`): con la recepción, la aseguradora y el tipo. En uno propio sin asegurado el backend copia el
 * cliente de la recepción; en uno de tercero el nombre es obligatorio (lo valida el backend).
 */
export function newClaimInput(receptionId: number, values: ClaimFormValues) {
  return {
    reception_id: receptionId,
    insurer_id: values.insurer_id,
    claim_type: values.claim_type,
    insured_name: nullIfEmpty(values.insured_name),
    ...details(values),
  }
}

/**
 * Edición (`PATCH claims/{id}`): recepción, aseguradora y tipo no cambian (el backend los prohíbe). El asegurado no
 * se vacía al editar: si queda en blanco no se envía.
 */
export function claimUpdateInput(values: ClaimFormValues, current?: Pick<Claim, 'deductible_billing_mode'>) {
  const insuredName = nullIfEmpty(values.insured_name)
  // La modalidad solo se envía si cambió: con el interruptor apagado, el backend rechaza reenviar una ya cargada.
  const mode = values.deductible_billing_mode === '' ? null : values.deductible_billing_mode
  const modeChanged = current !== undefined && mode !== (current.deductible_billing_mode?.value ?? null)
  return { ...(insuredName ? { insured_name: insuredName } : {}), ...details(values), ...(modeChanged ? { deductible_billing_mode: mode } : {}) }
}

/** Formulario a partir de un siniestro (edición) o vacío (alta). */
export function claimFormValues(claim?: Claim): ClaimFormValues {
  const dateTime = (value: string | null) => (value ? value.slice(0, 16) : '')
  return {
    insurer_id: claim?.insurer?.id ?? null,
    claim_type: claim?.claim_type.value ?? 'own',
    loss_date: claim?.loss_date ?? '',
    claim_number: claim?.claim_number ?? '',
    policy_number: claim?.policy_number ?? '',
    loss_description: claim?.loss_description ?? '',
    insured_name: claim?.insured.name ?? '',
    insured_document: claim?.insured.document ?? '',
    insured_phone: claim?.insured.phone ?? '',
    insured_email: claim?.insured.email ?? '',
    adjuster_name: claim?.adjuster.name ?? '',
    adjuster_phone: claim?.adjuster.phone ?? '',
    adjuster_email: claim?.adjuster.email ?? '',
    inspection_scheduled_at: dateTime(claim?.adjuster.inspection_scheduled_at ?? null),
    inspected_at: dateTime(claim?.adjuster.inspected_at ?? null),
    deductible_amount: claim?.deductible_amount ?? '',
    deductible_includes_tax: claim?.deductible_includes_tax === true ? 'true' : claim?.deductible_includes_tax === false ? 'false' : '',
    deductible_billing_mode: claim?.deductible_billing_mode?.value ?? '',
    coverage_notes: claim?.coverage_notes ?? '',
  }
}

/**
 * Por qué el deducible todavía bloquea la facturación y la entrega de un siniestro abierto: desconocido, mayor a 0 sin
 * la modalidad neta en vigor (A) o, con ella, sin indicar si incluye el IVA. null: no bloquea (0, o neta con el IVA).
 */
export function deductibleBlock(
  claim: Pick<Claim, 'status' | 'deductible_amount' | 'deductible_billing_mode' | 'deductible_includes_tax' | 'deductible_net_mode_available'>,
): 'unknown' | 'mode_undefined' | 'tax_undefined' | null {
  if (claim.status.value !== 'open') return null
  if (claim.deductible_amount === null) return 'unknown'
  if (Number(claim.deductible_amount) <= 0) return null
  const netMode = Boolean(claim.deductible_net_mode_available) && claim.deductible_billing_mode?.value === 'net_of_deductible'
  if (!netMode) return 'mode_undefined'
  return claim.deductible_includes_tax === null || claim.deductible_includes_tax === undefined ? 'tax_undefined' : null
}

/** Mensaje de cada bloqueo del deducible (tarjeta del siniestro y facturación del reparto). */
export const DEDUCTIBLE_BLOCK_MESSAGES: Record<NonNullable<ReturnType<typeof deductibleBlock>>, string> = {
  unknown: 'El deducible es desconocido: el reparto no se confirma, no se factura y la recepción no se entrega hasta informarlo.',
  mode_undefined: 'El siniestro tiene deducible y no tiene la modalidad neta: no se factura ni se entrega por el flujo habitual.',
  tax_undefined: 'Indique si el deducible incluye IVA: sin eso no se reparte ni se factura.',
}

export function claimDocumentFormData(file: File, type: ClaimDocumentType, notes: string): FormData {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  const trimmed = notes.trim()
  if (trimmed) form.append('notes', trimmed)
  return form
}

export const claimsApi = {
  list: (params: ListParams) => getPage<ClaimSummary>('/claims', params),
  show: (id: number) => getData<Claim>(`/claims/${id}`),
  /** Siniestro vigente (no cancelado) de la recepción; `null` si no tiene (el backend responde 404). */
  forReception: async (receptionId: number): Promise<Claim | null> => {
    try {
      return await getData<Claim>(`/receptions/${receptionId}/claim`)
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null
      throw error
    }
  },
  create: (body: ReturnType<typeof newClaimInput>) => postData<Claim>('/claims', body),
  update: (id: number, body: ReturnType<typeof claimUpdateInput>) => patchData<Claim>(`/claims/${id}`, body),
  cancel: (id: number, reason: string) => postData<Claim>(`/claims/${id}/cancel`, { reason }),
  documents: (id: number) => getData<ClaimDocument[]>(`/claims/${id}/documents`),
  upload: (id: number, file: File, type: ClaimDocumentType, notes: string) =>
    postData<ClaimDocument>(`/claims/${id}/documents`, claimDocumentFormData(file, type, notes)),
  download: (id: number, document: Pick<ClaimDocument, 'id' | 'original_name'>) =>
    downloadFile(`/claims/${id}/documents/${document.id}/download`, document.original_name),
  removeDocument: (id: number, documentId: number, reason: string) => deleteData(`/claims/${id}/documents/${documentId}`, { reason }),
  /** Resumen económico (M11): cada bloque llega solo con su permiso. */
  summary: (id: number) => getData<ClaimEconomicSummary>(`/claims/${id}/summary`),
}

/**
 * `GET claims/{id}/summary` (M11), sobre todos los presupuestos y OT de la recepción. `budgets` (con `claims.show`) y
 * `allocations` (con `work-order-allocations.show`) sin IVA; `billing` (con `invoices.show`) con IVA. No se suman entre sí.
 */
export interface ClaimEconomicSummary {
  claim: { id: number; code: string; deductible_amount: string | null }
  budgets?: {
    /** Solo de los presupuestos aprobados. */
    totals: { budgeted_total: string; insurer_amount: string; owner_amount: string; authorized_total: string; accepted_owner_amount: string }
    items: {
      budget_id: number
      code: string
      status: string
      status_label: string
      subtotal: string
      insurer_amount: string
      owner_amount: string
      authorization_version: number | null
      authorization_result: string | null
      authorized_total: string | null
      accepted_owner_amount: string | null
    }[]
  }
  allocations?: {
    totals: { insurer_amount: string; owner_amount: string; workshop_amount: string; deductible_amount: string; deductible_fiscal_pending: boolean }
    work_orders: {
      work_order_id: number
      work_order_code: string
      work_order_status: string
      requires_allocation: boolean
      allocation_version: number | null
      insurer_amount: string
      owner_amount: string
      workshop_amount: string
      deductible_amount: string | null
    }[]
  }
  billing?: {
    /** Solo de las facturas emitidas; los borradores se cuentan aparte. */
    totals: { net_invoiced: string; collected: string; balance: string }
    by_recipient: {
      recipient_type: 'insurer' | 'customer'
      recipient_label: string
      invoices_count: number
      drafts_count: number
      invoiced_total: string
      credited_total: string
      net_invoiced: string
      collected: string
      balance: string
    }[]
    invoices: {
      invoice_id: number
      number: string | null
      status: string
      status_label: string
      work_order_code: string | null
      recipient_type: 'insurer' | 'customer'
      recipient_label: string
      customer_name: string
      condition: string
      total: string
      credited_total: string
      paid_total: string
      balance: string
      payment_status: string | null
    }[]
  }
  alerts: string[]
}
