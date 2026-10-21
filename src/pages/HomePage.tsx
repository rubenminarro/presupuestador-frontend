import { Link } from 'react-router-dom'
import { visibleNavigation } from '@/app/navigation'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { useAuth } from '@/features/auth/useAuth'

export function HomePage() {
  const { user, can } = useAuth()
  // Accesos directos a los módulos permitidos (el dashboard con indicadores llega en la F11).
  const sections = visibleNavigation(can).filter((section) => section.title)

  return (
    <>
      <PageHeader pretitle="SyncTaller" title={`Hola, ${user?.first_name ?? ''}`} />
      <PageBody>
        <div className="row row-cards">
          {sections.map((section) => (
            <div key={section.title} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100">
                <div className="card-header">
                  <h3 className="card-title">{section.title}</h3>
                </div>
                <div className="list-group list-group-flush">
                  {section.items.map((item) => (
                    <Link key={item.to} to={item.to} className="list-group-item list-group-item-action d-flex align-items-center gap-2">
                      <item.icon size={18} stroke={1.75} className="text-secondary" aria-hidden="true" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </>
  )
}
