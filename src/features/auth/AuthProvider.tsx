import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/features/auth/AuthContext'
import { DEFAULT_PREFERENCES } from '@/features/preferences/api'
import { tokenStorage } from '@/lib/tokenStorage'
import { setUnauthorizedHandler } from '@/services/api'
import { authService } from '@/services/auth'

const SESSION_KEY = ['me'] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(() => tokenStorage.get())

  // La sesión se hidrata con GET /me al iniciar y después del login.
  const session = useQuery({
    queryKey: SESSION_KEY,
    queryFn: authService.me,
    enabled: token !== null,
    staleTime: Infinity,
  })

  useEffect(() => {
    // Token revocado o inválido en cualquier request: se vuelve al login.
    setUnauthorizedHandler(() => {
      setToken(null)
      queryClient.clear()
    })
    return () => setUnauthorizedHandler(null)
  }, [queryClient])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authService.login(email, password)
      tokenStorage.set(result.token)
      try {
        await queryClient.fetchQuery({ queryKey: SESSION_KEY, queryFn: authService.me, staleTime: Infinity })
      } catch (error) {
        tokenStorage.clear()
        throw error
      }
      setToken(result.token)
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Aunque falle la revocación, la sesión local se cierra igual.
    } finally {
      tokenStorage.clear()
      queryClient.clear()
      setToken(null)
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(() => {
    const permissions = session.data?.permissions ?? []
    const granted = new Set(permissions)

    let status: AuthStatus
    if (token === null) status = 'guest'
    else if (session.data) status = 'authenticated'
    else if (session.isError) status = 'error'
    else status = 'loading'

    return {
      status,
      user: session.data?.user ?? null,
      permissions,
      mechanic: session.data?.mechanic ?? null,
      preferences: session.data?.preferences ?? DEFAULT_PREFERENCES,
      error: session.error,
      retry: () => void session.refetch(),
      login,
      logout,
      can: (permission) => (Array.isArray(permission) ? permission.some((p) => granted.has(p)) : granted.has(permission)),
    }
  }, [token, session, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
