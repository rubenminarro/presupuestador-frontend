import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Estado del formulario de alta de un listado. Con `?new=1` en la URL (las acciones rápidas del inicio) se abre al
 * entrar, solo si el usuario tiene el permiso; después el parámetro se quita para que volver o recargar no lo reabra.
 */
export function useCreateParam(allowed: boolean) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [creating, setCreating] = useState(() => allowed && searchParams.get('new') === '1')

  useEffect(() => {
    if (!searchParams.has('new')) return
    setSearchParams(
      (params) => {
        params.delete('new')
        return params
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  return [creating, setCreating] as const
}
