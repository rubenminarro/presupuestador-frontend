import type { ReactNode } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useApiMutation } from '@/lib/useApiMutation'

interface DeleteDialogProps {
  title: string
  message: ReactNode
  onDelete: () => Promise<unknown>
  invalidate: QueryKey[]
  successMessage: string
  onClose: () => void
  /** Después de eliminar (p. ej. volver al listado desde un detalle). */
  onDeleted?: () => void
}

/** Confirmación de baja; los errores de negocio (p. ej. `SERVICE_IN_USE`) salen como toast. */
export function DeleteDialog({ title, message, onDelete, invalidate, successMessage, onClose, onDeleted }: DeleteDialogProps) {
  const mutation = useApiMutation(onDelete, {
    invalidate,
    successMessage,
    onSuccess: () => {
      onClose()
      onDeleted?.()
    },
  })

  return (
    <ConfirmDialog
      open
      title={title}
      message={message}
      confirmLabel="Eliminar"
      variant="danger"
      isLoading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
      onClose={onClose}
    />
  )
}
