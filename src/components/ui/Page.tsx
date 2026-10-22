import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  pretitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, pretitle, actions }: PageHeaderProps) {
  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          {/* En móvil las acciones bajan a su propia fila: si no, el título queda en una columna angosta. */}
          <div className="col-12 col-md">
            {pretitle && <div className="page-pretitle">{pretitle}</div>}
            <h2 className="page-title">{title}</h2>
          </div>
          {actions && (
            <div className="col-12 col-md-auto ms-md-auto">
              <div className="btn-list">{actions}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function PageBody({ children }: { children: ReactNode }) {
  return (
    <div className="page-body">
      <div className="container-xl">{children}</div>
    </div>
  )
}
