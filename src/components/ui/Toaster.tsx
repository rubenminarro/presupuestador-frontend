import { dismissToast, useToasts } from '@/lib/toast'

/** Avisos globales (éxito de mutaciones, errores no asociados a un formulario). */
export function Toaster() {
  const toasts = useToasts()

  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`alert alert-${toast.kind} alert-dismissible bg-white shadow-sm mb-2`} role="alert">
          <div>{toast.message}</div>
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => dismissToast(toast.id)} />
        </div>
      ))}
    </div>
  )
}
