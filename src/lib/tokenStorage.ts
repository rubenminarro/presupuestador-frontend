const KEY = 'presupuestador.token'

// localStorage puede no estar disponible (modo privado, bloqueado): la app sigue funcionando sin persistir.
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(KEY, token)
    } catch {
      // Sin persistencia: la sesión dura hasta recargar.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Nada que limpiar.
    }
  },
}
