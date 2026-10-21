import { MutationCache, QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/services/api'
import { toast } from '@/lib/toast'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Toast de éxito al terminar la mutación. */
      successMessage?: string
      /** La pantalla muestra el error por su cuenta (además de los 422, que siempre van al formulario). */
      skipErrorToast?: boolean
    }
  }
}

/** Solo se reintenta lo que puede ser transitorio: red caída o error del servidor. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false
  return isApiError(error) && (error.status === 0 || error.status >= 500)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
  // Los errores de consultas los muestra cada pantalla (ErrorState); los de mutaciones van a un toast.
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.meta?.successMessage) toast.success(mutation.meta.successMessage)
    },
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipErrorToast) return
      if (isApiError(error) && (error.isValidation || error.status === 401)) return
      toast.error(isApiError(error) ? error.message : 'Ocurrió un error inesperado.')
    },
  }),
})
