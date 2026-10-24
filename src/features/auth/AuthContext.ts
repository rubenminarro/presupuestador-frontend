import { createContext } from 'react'
import type { Preferences } from '@/features/preferences/api'
import type { LinkedMechanic, User } from '@/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  permissions: string[]
  /** Ficha de mecánico del usuario, si la tiene (p. ej. para ver sus comisiones sin `mechanics.index`). */
  mechanic: LinkedMechanic | null
  /** Preferencias visuales del usuario (los predeterminados sin sesión). */
  preferences: Preferences
  /** Error al cargar la sesión (red caída, 5xx); con 401 la sesión pasa a `guest`. */
  error: unknown
  retry: () => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** UX solamente: el backend vuelve a validar cada permiso. Con una lista, alcanza con tener uno. */
  can: (permission: string | string[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
