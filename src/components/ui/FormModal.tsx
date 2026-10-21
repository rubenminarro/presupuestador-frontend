import { useId, type ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'

interface FormModalProps {
  title: string
  onClose: () => void
  onSubmit: () => void
  isSubmitting?: boolean
  submitLabel?: string
  size?: 'sm' | 'lg' | 'xl'
  children: ReactNode
}

/** Modal con un formulario: Enter envía, el botón muestra el progreso y no se cierra mientras se guarda. */
export function FormModal({ title, onClose, onSubmit, isSubmitting, submitLabel = 'Guardar', size, children }: FormModalProps) {
  const formId = useId()

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      size={size}
      busy={isSubmitting}
      footer={
        <>
          <button type="button" className="btn btn-link link-secondary me-auto" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {submitLabel}
          </button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        {children}
      </form>
    </Modal>
  )
}
