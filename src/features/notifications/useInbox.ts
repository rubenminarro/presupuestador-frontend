import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/features/notifications/api'
import { useApiMutation } from '@/lib/useApiMutation'

// La campana y la bandeja comparten el prefijo ['me-notifications']: marcar en una refresca la otra.

/** Los últimos avisos y el contador de no leídos (campana e inicio comparten la consulta). Se refresca cada minuto. */
export function useInboxPreview() {
  return useQuery({
    queryKey: ['me-notifications', 'bell'],
    queryFn: () => notificationsApi.inbox({ per_page: 6 }),
    refetchInterval: 60_000,
  })
}

export function useMarkAsRead() {
  return useApiMutation((id: string) => notificationsApi.markAsRead(id), { invalidate: [['me-notifications']] })
}

export function useMarkAllAsRead() {
  return useApiMutation(() => notificationsApi.markAllAsRead(), {
    invalidate: [['me-notifications']],
    successMessage: 'Avisos marcados como leídos.',
  })
}
