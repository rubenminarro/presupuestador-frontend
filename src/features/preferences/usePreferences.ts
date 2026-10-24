import { useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { DEFAULT_PREFERENCES, preferencesApi, type Preferences } from '@/features/preferences/api'
import { applyPreferences } from '@/features/preferences/theme'
import type { Session } from '@/types/auth'

/** Misma clave que la sesión en `AuthProvider`: las preferencias viajan en `GET /me`. */
const SESSION_KEY = ['me'] as const

/**
 * Preferencias del usuario con cambio optimista: se aplican al instante y se guardan en segundo plano. Si el
 * guardado falla se vuelve a pedir la sesión y la interfaz queda como en el servidor.
 */
export function usePreferences() {
  const queryClient = useQueryClient()
  const { preferences } = useAuth()

  const setLocal = useCallback(
    (next: Preferences) => {
      queryClient.setQueryData<Session>(SESSION_KEY, (session) => (session ? { ...session, preferences: next } : session))
    },
    [queryClient],
  )

  // El toast de error lo muestra el MutationCache global.
  const rollback = useCallback(() => void queryClient.invalidateQueries({ queryKey: SESSION_KEY }), [queryClient])

  const updateMutation = useMutation({ mutationFn: preferencesApi.update, onError: rollback })

  const resetMutation = useMutation({
    mutationFn: preferencesApi.reset,
    meta: { successMessage: 'Se restauraron los valores predeterminados.' },
    onError: rollback,
  })

  const update = useCallback(
    (changes: Partial<Preferences>) => {
      setLocal({ ...preferences, ...changes })
      updateMutation.mutate(changes)
    },
    [preferences, setLocal, updateMutation],
  )

  const reset = useCallback(() => {
    setLocal(DEFAULT_PREFERENCES)
    resetMutation.mutate()
  }, [setLocal, resetMutation])

  return {
    preferences,
    update,
    reset,
    isSaving: updateMutation.isPending || resetMutation.isPending,
  }
}

/**
 * Aplica las preferencias de la sesión a toda la app cada vez que cambian (al iniciar sesión, al editarlas o al
 * recargar). Sin sesión no toca nada: el login conserva la última apariencia de este navegador.
 */
export function PreferencesSync() {
  const { status, preferences } = useAuth()

  useEffect(() => {
    if (status === 'authenticated') applyPreferences(preferences)
  }, [status, preferences])

  return null
}
