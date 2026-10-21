import { createContext } from 'react'
import type { User } from '@/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  permissions: string[]
  /** Error al cargar la sesión (red caída, 5xx); con 401 la sesión pasa a `guest`. */
  error: unknown
  retry: () => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** UX solamente: el backend vuelve a validar cada permiso. Con una lista, alcanza con tener uno. */
  can: (permission: string | string[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
