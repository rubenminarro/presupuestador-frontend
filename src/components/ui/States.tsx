import type { ReactNode } from 'react'
import { IconAlertTriangle, IconInbox } from '@tabler/icons-react'
import { isApiError } from '@/services/api'

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-secondary" role="status">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

interface EmptyStateProps {
  title?: string
  message?: string
  action?: ReactNode
}

export function EmptyState({ title = 'Sin resultados', message, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <IconInbox size={48} stroke={1.5} aria-hidden="true" />
      </div>
      <p className="empty-title">{title}</p>
      {message && <p className="empty-subtitle text-secondary">{message}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message = isApiError(error) ? error.message : 'Ocurrió un error inesperado.'

  return (
    <div className="alert alert-danger m-3" role="alert">
      <div className="d-flex align-items-center gap-2">
        <IconAlertTriangle size={20} aria-hidden="true" />
        <div className="flex-fill">{message}</div>
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
