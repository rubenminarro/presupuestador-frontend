import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { navigation } from '@/app/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, RequirePermission } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { NotFoundPage } from '@/pages/ErrorPages'
import { HomePage } from '@/pages/HomePage'

// Módulos aún no construidos: una pantalla provisoria por ítem del menú, con su permiso.
// Cada fase reemplaza la suya por las rutas reales del módulo.
const pendingModules: RouteObject[] = navigation
  .flatMap((section) => section.items)
  .filter((item) => item.to !== '/')
  .map((item) => ({
    path: item.to.slice(1),
    element: item.permission ? (
      <RequirePermission permission={item.permission}>
        <ComingSoonPage title={item.label} phase={item.phase} />
      </RequirePermission>
    ) : (
      <ComingSoonPage title={item.label} phase={item.phase} />
    ),
  }))

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [{ index: true, element: <HomePage /> }, ...pendingModules, { path: '*', element: <NotFoundPage /> }],
      },
    ],
  },
])
