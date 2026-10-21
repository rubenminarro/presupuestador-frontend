import axios, { type AxiosResponse } from 'axios'
import { tokenStorage } from '@/lib/tokenStorage'
import type { ApiEnvelope, ListParams, Paginated, PaginationMeta, ValidationErrors } from '@/types/api'

/** Error normalizado de la API: `message` (en español, apto para el usuario), `status`, `error_code` y `errors`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  readonly errors: ValidationErrors | null

  constructor(message: string, status: number, code: string | null, errors: ValidationErrors | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }

  get isValidation(): boolean {
    return this.status === 422 && this.errors !== null
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Errores por campo de un 422; vacío para cualquier otro error. */
export function validationErrors(error: unknown): ValidationErrors {
  return isApiError(error) && error.isValidation ? (error.errors ?? {}) : {}
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
})

let unauthorizedHandler: (() => void) | null = null

/** Lo registra la sesión: se llama cuando un request con token recibe 401 (token revocado o inválido). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(undefined, async (error: unknown) => {
  const apiError = await toApiError(error)

  // Sin token (p. ej. login con credenciales inválidas) el 401 es un error más del formulario.
  if (apiError.status === 401 && tokenStorage.get()) {
    tokenStorage.clear()
    unauthorizedHandler?.()
  }

  return Promise.reject(apiError)
})

async function toApiError(error: unknown): Promise<ApiError> {
  if (!axios.isAxiosError(error)) {
    return new ApiError('Ocurrió un error inesperado.', 0, null)
  }

  if (!error.response) {
    return new ApiError('No se pudo conectar con el servidor.', 0, 'NETWORK_ERROR')
  }

  const status = error.response.status
  let body: unknown = error.response.data

  // Las descargas piden un blob: si fallan, el JSON del error viene dentro.
  if (body instanceof Blob) {
    try {
      body = JSON.parse(await body.text())
    } catch {
      body = null
    }
  }

  if (isEnvelope(body)) {
    return new ApiError(body.message || defaultMessage(status), status, body.error_code ?? null, body.errors ?? null)
  }

  return new ApiError(defaultMessage(status), status, null)
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return typeof body === 'object' && body !== null && 'message' in body
}

function defaultMessage(status: number): string {
  if (status === 403) return 'No tiene permiso para realizar esta acción.'
  if (status === 404) return 'El recurso solicitado no existe.'
  if (status >= 500) return 'El servidor no pudo procesar la solicitud.'
  return 'La solicitud no pudo completarse.'
}

/** Quita los parámetros vacíos para no enviar filtros `?search=`. */
function cleanParams(params?: ListParams): ListParams | undefined {
  if (!params) return undefined
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

export async function getData<T>(url: string, params?: ListParams): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params: cleanParams(params) })
  return data.data
}

export async function getPage<T>(url: string, params?: ListParams): Promise<Paginated<T>> {
  const { data } = await api.get<ApiEnvelope<T[], PaginationMeta>>(url, { params: cleanParams(params) })
  return {
    items: data.data,
    pagination: data.meta?.pagination ?? { total: data.data.length, perPage: data.data.length, currentPage: 1, lastPage: 1 },
  }
}

export async function postData<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<ApiEnvelope<T>>(url, body)
  return data.data
}

export async function putData<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<ApiEnvelope<T>>(url, body)
  return data.data
}

export async function patchData<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiEnvelope<T>>(url, body)
  return data.data
}

export async function deleteData<T = null>(url: string): Promise<T> {
  const { data } = await api.delete<ApiEnvelope<T>>(url)
  return data.data
}

/**
 * Descarga un archivo (PDF/CSV) con el nombre que manda el servidor en `Content-Disposition` (expuesto por CORS);
 * `fallbackName` se usa si el header no llega.
 */
export async function downloadFile(url: string, fallbackName: string, params?: ListParams): Promise<void> {
  const response = await api.get<Blob>(url, { params: cleanParams(params), responseType: 'blob' })
  const href = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = href
  link.download = fileNameFrom(response) ?? fallbackName
  link.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function fileNameFrom(response: AxiosResponse): string | null {
  const header = response.headers['content-disposition']
  if (typeof header !== 'string') return null
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header)
  return match ? decodeURIComponent(match[1]) : null
}
