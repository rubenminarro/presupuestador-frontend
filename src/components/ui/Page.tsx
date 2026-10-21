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
          <div className="col">
            {pretitle && <div className="page-pretitle">{pretitle}</div>}
            <h2 className="page-title">{title}</h2>
          </div>
          {actions && (
            <div className="col-auto ms-auto">
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
