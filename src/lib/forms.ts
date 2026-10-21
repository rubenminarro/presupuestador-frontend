/**
 * Quita los campos vacíos ('', null, undefined). Las actualizaciones del backend validan los opcionales como
 * `sometimes` sin `nullable`: enviar null o '' da 422, así que un campo vacío simplemente no se envía.
 */
export function compact<T extends Record<string, unknown>>(values: T): { [K in keyof T]?: NonNullable<T[K]> } {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  ) as { [K in keyof T]?: NonNullable<T[K]> }
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
