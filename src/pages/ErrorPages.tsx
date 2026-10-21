import { Link } from 'react-router-dom'

interface ErrorPageProps {
  code: string
  title: string
  message: string
}

function ErrorPage({ code, title, message }: ErrorPageProps) {
  return (
    <div className="page-body">
      <div className="container-tight py-4">
        <div className="empty">
          <div className="empty-header">{code}</div>
          <p className="empty-title">{title}</p>
          <p className="empty-subtitle text-secondary">{message}</p>
          <div className="empty-action">
            <Link to="/" className="btn btn-primary">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return <ErrorPage code="404" title="Página no encontrada" message="La dirección no corresponde a ninguna pantalla." />
}

export function ForbiddenPage() {
  return <ErrorPage code="403" title="Sin acceso" message="Su usuario no tiene permiso para ver esta pantalla." />
}
