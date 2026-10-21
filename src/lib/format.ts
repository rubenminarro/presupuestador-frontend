// Formato para Paraguay: separador de miles ".", decimal ",". Los importes llegan como string (BCMath) o número.

type Numeric = string | number | null | undefined

const guaraniFormat = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('es-PY', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

/** Guaraníes enteros: `Gs. 1.250.000`. */
export function formatGuarani(value: Numeric): string {
  const number = toNumber(value)
  return number === null ? '—' : `Gs. ${guaraniFormat.format(number)}`
}

/** Número con decimales fijos (importes sin IVA, porcentajes). */
export function formatDecimal(value: Numeric, digits = 2): string {
  const number = toNumber(value)
  if (number === null) return '—'
  return new Intl.NumberFormat('es-PY', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(number)
}

/** Cantidades de inventario: hasta 3 decimales, sin ceros de relleno. */
export function formatQuantity(value: Numeric): string {
  const number = toNumber(value)
  return number === null ? '—' : new Intl.NumberFormat('es-PY', { maximumFractionDigits: 3 }).format(number)
}

/** Fechas `YYYY-MM-DD` se leen como fecha local (sin desfase de zona horaria); el resto como ISO. */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? dateFormat.format(date) : '—'
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? dateTimeFormat.format(date) : '—'
}
