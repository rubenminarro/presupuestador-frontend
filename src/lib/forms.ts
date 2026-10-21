/**
 * Quita los campos vacíos ('', null, undefined): para campos que el backend no acepta como null (p. ej. costo y
 * comisión del mecánico, columnas NOT NULL) y que, vacíos, deben quedar como están.
 */
export function compact<T extends Record<string, unknown>>(values: T): { [K in keyof T]?: NonNullable<T[K]> } {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  ) as { [K in keyof T]?: NonNullable<T[K]> }
}

/** Texto opcional: vacío → null, así al editar se vacía el campo (el backend acepta null en los opcionales). */
export function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Texto de un input numérico a número; vacío → null. */
export function toNumber(value: string): number | null {
  if (value.trim() === '') return null
  const number = Number(value.replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

/** Valor de la API a texto para un input (null/undefined → ''). */
export function toInput(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}
