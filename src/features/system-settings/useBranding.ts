import { useEffect, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BRANDING_KEY, systemSettingsApi, type Branding } from '@/features/system-settings/api'

const EMPTY: Branding = { logo_url: null, logo_black_url: null }

/** Logo del sistema y su versión negra. Cambia poco: se pide una vez y se refresca al subirlo o quitarlo. */
export function useBranding(): Branding {
  const query = useQuery({ queryKey: BRANDING_KEY, queryFn: systemSettingsApi.branding, staleTime: Infinity })
  return query.data ?? EMPTY
}

/** Atributo de `<html>` (los `data-bs-*` de las preferencias), reactivo a sus cambios. */
function useHtmlAttribute(name: string): string | null {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: [name] })
      return () => observer.disconnect()
    },
    () => document.documentElement.getAttribute(name),
  )
}

/**
 * URL del logo que se lee sobre el fondo donde va: la versión negra sobre fondo claro y el logo subido sobre fondo
 * oscuro. `navbar` sigue el color de la navegación (oscura o de acento salvo "como la página"); `page`, el tema.
 */
export function useLogo(on: 'page' | 'navbar'): string | null {
  const { logo_url, logo_black_url } = useBranding()
  const theme = useHtmlAttribute('data-bs-theme')
  const navbarTheme = useHtmlAttribute('data-bs-navbar-theme')

  const darkBackground = theme === 'dark' || (on === 'navbar' && navbarTheme !== null && navbarTheme !== 'default')
  return darkBackground ? logo_url : logo_black_url
}

const DEFAULT_FAVICON = '/favicon.svg'

/**
 * Usa el logo como ícono de la pestaña; sin logo, el ícono original. La pestaña sigue el tema del sistema operativo,
 * así que en oscuro va el logo subido y en claro la versión negra.
 */
export function BrandingSync() {
  const { logo_url, logo_black_url } = useBranding()
  const systemDark = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-color-scheme: dark)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const favicon = systemDark ? logo_url : logo_black_url

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    link.type = favicon ? '' : 'image/svg+xml'
    link.href = favicon ?? DEFAULT_FAVICON
  }, [favicon])

  return null
}
