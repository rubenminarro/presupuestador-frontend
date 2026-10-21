import { useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'
import { TextareaField } from '@/components/ui/FormField'
import { validationErrors } from '@/services/api'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  variant?: 'primary' | 'danger' | 'warning'
  /** Pide un motivo obligatorio (anulaciones y cancelaciones). */
  reason?: {
    label?: string
    /** Nombre del campo en la API, para mostrar su error 422. */
    field?: string
  }
  isLoading?: boolean
  /** Error de la mutación, para mostrar el 422 del motivo. */
  error?: unknown
  onConfirm: (reason?: string) => void
  onClose: () => void
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  // Se monta de nuevo en cada apertura, así el motivo empieza vacío.
  if (!props.open) return null
  return <ConfirmDialogContent {...props} />
}

function ConfirmDialogContent({
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'primary',
  reason,
  isLoading,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [reasonText, setReasonText] = useState('')
  const reasonField = reason?.field ?? 'reason'
  const canConfirm = !isLoading && (!reason || reasonText.trim() !== '')

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      size="sm"
      busy={isLoading}
      footer={
        <>
          <button type="button" className="btn btn-link link-secondary me-auto" onClick={onClose} disabled={isLoading}>
            Volver
          </button>
          <button
            type="button"
            className={`btn btn-${variant}`}
            disabled={!canConfirm}
            onClick={() => onConfirm(reason ? reasonText.trim() : undefined)}
          >
            {isLoading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="mb-3">{message}</div>
      {reason && (
        <TextareaField
          label={reason.label ?? 'Motivo'}
          name={reasonField}
          errors={validationErrors(error)}
          required
          rows={3}
          value={reasonText}
          onChange={(event) => setReasonText(event.target.value)}
        />
      )}
    </Modal>
  )
}
