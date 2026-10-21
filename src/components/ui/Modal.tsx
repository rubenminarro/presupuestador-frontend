import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/cx'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'lg' | 'xl'
  /** Evita cerrar con Escape o clic afuera mientras se guarda. */
  busy?: boolean
}

/** Modal de Tabler controlado por React (sin el JS de Bootstrap). */
export function Modal({ open, title, onClose, children, footer, size, busy }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  // Escape usa siempre el último onClose/busy sin re-ejecutar el efecto (que movería el foco en cada render).
  const latest = useRef({ onClose, busy })

  useEffect(() => {
    latest.current = { onClose, busy }
  })

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    document.body.classList.add('modal-open')

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !latest.current.busy) latest.current.onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('modal-open')
      previousFocus?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <>
      <div
        ref={dialogRef}
        className="modal modal-blur fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) onClose()
        }}
      >
        <div className={cx('modal-dialog modal-dialog-centered', size && `modal-${size}`)}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={titleId}>
                {title}
              </h5>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} disabled={busy} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>,
    document.body,
  )
}
