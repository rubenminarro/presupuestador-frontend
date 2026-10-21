/** Errores por campo de un 422 (`errors` del contrato). */
export type ValidationErrors = Record<string, string[]>

/** Sobre común de todas las respuestas JSON de la API. */
export interface ApiEnvelope<TData, TMeta = unknown> {
  success: boolean
  status: number
  message: string
  data: TData
  errors: ValidationErrors | null
  meta?: TMeta | null
  error_code?: string | null
  timestamp?: string
}

/** `meta.pagination` de los listados. */
export interface Pagination {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface PaginationMeta {
  pagination: Pagination
}

export interface Paginated<T> {
  items: T[]
  pagination: Pagination
}

/** Parámetros de listado: `page`, `per_page`, `search` y filtros propios de cada endpoint. */
export type ListParams = Record<string, string | number | boolean | null | undefined>
