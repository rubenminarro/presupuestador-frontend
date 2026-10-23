import { notificationsApi } from '@/features/notifications/api'
import { useApiMutation } from '@/lib/useApiMutation'

// La campana y la bandeja comparten el prefijo ['me-notifications']: marcar en una refresca la otra.

export function useMarkAsRead() {
  return useApiMutation((id: string) => notificationsApi.markAsRead(id), { invalidate: [['me-notifications']] })
}

export function useMarkAllAsRead() {
  return useApiMutation(() => notificationsApi.markAllAsRead(), {
    invalidate: [['me-notifications']],
    successMessage: 'Avisos marcados como leídos.',
  })
}
