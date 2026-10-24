import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import '@tabler/core/dist/css/tabler.min.css'
// Colores de acento, paletas, tipografías y redondeo (data-bs-theme-*): las preferencias del usuario.
import '@tabler/core/dist/css/tabler-themes.min.css'
import './index.css'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/Toaster'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PreferencesSync } from '@/features/preferences/usePreferences'
import { BrandingSync } from '@/features/system-settings/useBranding'
import { queryClient } from '@/lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesSync />
        <BrandingSync />
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
