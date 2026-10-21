import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

interface ApiMutationOptions<TData, TVariables> {
  /** Consultas a refrescar al terminar bien (por prefijo: `['clients']` refresca listados y detalles). */
  invalidate?: QueryKey[]
  /** Toast de éxito. */
  successMessage?: string
  onSuccess?: (data: TData, variables: TVariables) => void
}

/** Mutación con toast de éxito/error y refresco de consultas. Los 422 los muestra el formulario. */
export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  { invalidate = [], successMessage, onSuccess }: ApiMutationOptions<TData, TVariables> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    meta: { successMessage },
    onSuccess: (data, variables) => {
      // Primero el callback (puede navegar y desmontar la pantalla); las consultas inactivas no se vuelven a pedir.
      onSuccess?.(data, variables)
      invalidate.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
    },
  })
}
