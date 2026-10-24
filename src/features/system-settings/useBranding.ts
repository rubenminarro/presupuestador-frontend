import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BRANDING_KEY, systemSettingsApi } from '@/features/system-settings/api'

/** URL del logo del sistema o `null`. Cambia poco: se pide una vez y se refresca al subirlo o quitarlo. */
export function useBranding(): string | null {
  const query = useQuery({ queryKey: BRANDING_KEY, queryFn: systemSettingsApi.branding, staleTime: Infinity })
  return query.data?.logo_url ?? null
}

const DEFAULT_FAVICON = '/favicon.svg'

/** Usa el logo como ícono de la pestaña; sin logo, el ícono original. */
export function BrandingSync() {
  const logoUrl = useBranding()

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    link.type = logoUrl ? '' : 'image/svg+xml'
    link.href = logoUrl ?? DEFAULT_FAVICON
  }, [logoUrl])

  return null
}
