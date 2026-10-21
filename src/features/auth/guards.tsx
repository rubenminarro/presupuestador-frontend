import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/useAuth'
import { ForbiddenPage } from '@/pages/ErrorPages'

/** Exige sesión: sin token va al login (y vuelve a la ruta pedida después de ingresar). */
export function ProtectedRoute() {
  const { status, error, retry, logout } = useAuth()
  const location = useLocation()

  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (status === 'loading') {
    return (
      <div className="page page-center">
        <LoadingState label="Cargando sesión…" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page page-center">
        <div className="container container-tight py-4">
          <ErrorState error={error} onRetry={retry} />
          <div className="text-center">
            <button type="button" className="btn btn-link" onClick={() => void logout()}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <Outlet />
}

/** UX: oculta la pantalla si el usuario no tiene el permiso. El backend responde 403 de todas formas. */
export function RequirePermission({ permission, children }: { permission: string | string[]; children: ReactNode }) {
  const { can } = useAuth()
  return can(permission) ? children : <ForbiddenPage />
}
