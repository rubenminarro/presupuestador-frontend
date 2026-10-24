import { useQuery } from '@tanstack/react-query'
import { visibleNavigation } from '@/app/navigation'
import { PageBody } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/useAuth'
import { AttentionCard, HomeIndicators, RecentNotifications, Shortcuts, WelcomeHeader } from '@/features/home/HomeSections'
import { reportsApi } from '@/features/reports/api'

/**
 * Inicio: bienvenida con acciones rápidas, indicadores del mes, lo que requiere atención, los últimos avisos y los
 * accesos directos. Los indicadores y los pendientes salen de `GET /dashboard` (con `dashboard.view`); cada bloque
 * llega solo si el usuario tiene el permiso de su reporte. Los detalles quedan en Reportes.
 */
export function HomePage() {
  const { can } = useAuth()
  const canDashboard = can('dashboard.view')
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: reportsApi.dashboard, enabled: canDashboard })
  const sections = visibleNavigation(can).filter((section) => section.title)

  return (
    <>
      <WelcomeHeader />
      <PageBody>
        {canDashboard &&
          (dashboard.data ? (
            <HomeIndicators data={dashboard.data} />
          ) : (
            <div className="card mb-3">
              {dashboard.error ? <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} /> : <LoadingState />}
            </div>
          ))}
        <div className="row row-cards mb-3">
          <div className="col-lg-6">
            <AttentionCard data={dashboard.data} />
          </div>
          <div className="col-lg-6">
            <RecentNotifications />
          </div>
        </div>
        {sections.length > 0 && <Shortcuts sections={sections} />}
      </PageBody>
    </>
  )
}
