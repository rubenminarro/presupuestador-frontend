export interface Role {
  id: number
  name: string
  description: string | null
  guard_name: string
  created_at: string
  updated_at: string
  /** IDs de los permisos del rol (los nombres vienen en `Session.permissions`). */
  permissions: number[]
}

/** `UserResource` del backend. */
export interface User {
  id: number
  name: string
  first_name: string
  last_name: string
  email: string
  roles: Role[]
}

/** Ficha de mecánico vinculada al usuario (`data.mechanic` de `GET /api/me`). */
export interface LinkedMechanic {
  id: number
  employee_code: string
  full_name: string
}

/** Respuesta de `GET /api/me`. */
export interface Session {
  user: User
  permissions: string[]
  mechanic: LinkedMechanic | null
}

/** Respuesta de `POST /api/login`. */
export interface LoginResult {
  token: string
  user: User
}
