import type { Preferences } from '@/features/preferences/api'

/**
 * Aplica las preferencias como atributos `data-bs-*` en `<html>`, que Tabler 1.7 interpreta en vivo (sin recargar).
 * La clave se traduce cambiando `_` por `-`: `theme_primary` → `data-bs-theme-primary`. El mismo criterio usa el
 * script de `index.html`, que aplica la copia local antes de pintar para evitar el parpadeo.
 *
 * No se usan `tabler-theme.js` ni `sidebar.ts`: guardan en localStorage y manipulan el DOM por su cuenta.
 */

/** Copia local de las últimas preferencias aplicadas (solo para el primer pintado; la fuente es el backend). */
const CACHE_KEY = 'synctaller.preferences'

const darkScheme = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

let current: Preferences | null = null

export function applyPreferences(preferences: Preferences): void {
  current = preferences
  const root = document.documentElement

  for (const [key, value] of Object.entries(preferences)) {
    root.setAttribute(`data-bs-${key.replace(/_/g, '-')}`, key === 'theme' ? resolveTheme(value) : value)
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(preferences))
  } catch {
    // Sin localStorage: se aplican igual, solo puede haber parpadeo al recargar.
  }
}

function resolveTheme(theme: string): string {
  if (theme !== 'auto') return theme
  return darkScheme?.matches ? 'dark' : 'light'
}

// Modo automático: sigue los cambios del sistema operativo mientras la app está abierta.
darkScheme?.addEventListener('change', () => {
  if (current?.theme === 'auto') {
    document.documentElement.setAttribute('data-bs-theme', resolveTheme('auto'))
  }
})
