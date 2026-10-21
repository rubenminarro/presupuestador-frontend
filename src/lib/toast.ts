import { useSyncExternalStore } from 'react'

export type ToastKind = 'success' | 'danger' | 'warning' | 'info'

export interface ToastMessage {
  id: number
  kind: ToastKind
  message: string
}

const DURATION_MS = 5000

let toasts: ToastMessage[] = []
let sequence = 0
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function push(kind: ToastKind, message: string): void {
  const id = ++sequence
  toasts = [...toasts, { id, kind, message }]
  emit()
  setTimeout(() => dismissToast(id), DURATION_MS)
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

/** Avisos globales; se pueden lanzar desde fuera de React (p. ej. el `MutationCache`). */
export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('danger', message),
  warning: (message: string) => push('warning', message),
  info: (message: string) => push('info', message),
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useToasts(): ToastMessage[] {
  return useSyncExternalStore(subscribe, () => toasts)
}
