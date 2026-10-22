import { getData, patchData, postData } from '@/services/api'

/** `InvoiceStampResource`. */
export interface InvoiceStamp {
  id: number
  stamp_number: string
  establishment: string
  expedition_point: string
  valid_from: string
  valid_until: string
  next_number: number
  /** Próximo número de factura con formato (`001-001-0000001`). */
  next_invoice_number: string
  is_active: boolean
  is_valid_today: boolean
  created_at: string
  updated_at: string
}

export interface InvoiceStampInput {
  stamp_number: string
  establishment: string
  expedition_point: string
  valid_from: string
  valid_until: string
  /** Vacío: empieza en 1. */
  next_number: number | null
  is_active: boolean
}

/** Timbrados con los que se puede emitir hoy. */
export function issuableStamps(stamps: InvoiceStamp[]): InvoiceStamp[] {
  return stamps.filter((stamp) => stamp.is_active && stamp.is_valid_today)
}

export const invoiceStampsApi = {
  /** Sin paginar: activos primero. */
  list: () => getData<InvoiceStamp[]>('/invoice-stamps'),
  create: (body: InvoiceStampInput) => postData<InvoiceStamp>('/invoice-stamps', body),
  update: (id: number, body: { valid_until: string; is_active: boolean }) => patchData<InvoiceStamp>(`/invoice-stamps/${id}`, body),
}
