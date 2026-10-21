/** Une clases CSS ignorando los valores falsos: `cx('btn', active && 'active')`. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
