import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconSend } from '@tabler/icons-react'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import {
  CLIENT_NOTIFICATION_STATUS,
  clientNotificationLink,
  notificationsApi,
  SUBJECT_LABELS,
  type ClientNotificationDetail,
} from '@/features/notifications/api'
import { formatDateTime } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'

interface ClientNotificationModalProps {
  notificationId: number
  onClose: () => void
  /** Tras reenviar se muestra el aviso nuevo (otro registro). */
  onResent: (id: number) => void
}

/** Detalle de un aviso al cliente con su reenvío (crea otro registro con el contenido actual del documento). */
export function ClientNotificationModal({ notificationId, onClose, onResent }: ClientNotificationModalProps) {
  const { can } = useAuth()
  const detail = useQuery({
    queryKey: ['client-notifications', 'detail', notificationId],
    queryFn: () => notificationsApi.clientShow(notificationId),
  })

  // Los errores de negocio (CLIENT_NOTIFICATION_PENDING, CLIENT_WITHOUT_EMAIL, …) salen como toast.
  const resend = useApiMutation(() => notificationsApi.resend(notificationId), {
    invalidate: [['client-notifications']],
    successMessage: 'Aviso reenviado: se registró un aviso nuevo.',
    onSuccess: (notification) => onResent(notification.id),
  })

  const notification = detail.data
  const canResend = can('client-notifications.resend') && notification && notification.status.value !== 'pending'

  return (
    <Modal
      open
      title={notification ? `Aviso #${notification.id}` : 'Aviso al cliente'}
      onClose={onClose}
      size="lg"
      busy={resend.isPending}
      footer={
        <>
          <button type="button" className="btn btn-link link-secondary me-auto" onClick={onClose} disabled={resend.isPending}>
            Cerrar
          </button>
          {can('client-notifications.resend') && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canResend || resend.isPending}
              title={notification?.status.value === 'pending' ? 'El aviso todavía está en cola.' : undefined}
              onClick={() => resend.mutate()}
            >
              {resend.isPending ? (
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              ) : (
                <IconSend size={18} className="me-1" aria-hidden="true" />
              )}
              Reenviar
            </button>
          )}
        </>
      }
    >
      {notification ? (
        <NotificationDetail notification={notification} />
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      ) : (
        <LoadingState />
      )}
    </Modal>
  )
}

function NotificationDetail({ notification }: { notification: ClientNotificationDetail }) {
  const { client, subject } = notification
  const link = clientNotificationLink(subject)
  const subjectLabel = `${SUBJECT_LABELS[subject.type] ?? subject.type} ${subject.code ?? `#${subject.id}`}`

  return (
    <>
      {notification.error && (
        <div className={`alert ${notification.status.value === 'failed' ? 'alert-danger' : 'alert-secondary'}`}>
          {notification.status.value === 'failed' ? 'Error al enviar: ' : 'Motivo: '}
          {notification.error}
        </div>
      )}
      {client && !client.notifications_enabled && (
        <div className="alert alert-warning">El cliente tiene los avisos desactivados: un reenvío quedaría rechazado.</div>
      )}
      <dl className="row mb-0">
        <dt className="col-5 col-md-4">Tipo</dt>
        <dd className="col-7 col-md-8">{notification.type.label}</dd>
        <dt className="col-5 col-md-4">Estado</dt>
        <dd className="col-7 col-md-8">
          <StatusBadge value={notification.status.value} map={CLIENT_NOTIFICATION_STATUS} />
          {notification.attempts > 0 && <span className="text-secondary small ms-2">{notification.attempts} intento(s)</span>}
        </dd>
        <dt className="col-5 col-md-4">Cliente</dt>
        <dd className="col-7 col-md-8">
          {client ? <Link to={`/clients/${client.id}`}>{client.full_name}</Link> : <span className="text-secondary">Eliminado</span>}
        </dd>
        <dt className="col-5 col-md-4">Documento</dt>
        <dd className="col-7 col-md-8">{link ? <Link to={link}>{subjectLabel}</Link> : subjectLabel}</dd>
        <dt className="col-5 col-md-4">Canal</dt>
        <dd className="col-7 col-md-8">{notification.channel.label}</dd>
        <dt className="col-5 col-md-4">Destinatario</dt>
        <dd className="col-7 col-md-8 text-break">{notification.recipient ?? '—'}</dd>
        <dt className="col-5 col-md-4">Registrado</dt>
        <dd className="col-7 col-md-8">{formatDateTime(notification.created_at)}</dd>
        <dt className="col-5 col-md-4">Enviado</dt>
        <dd className="col-7 col-md-8">{formatDateTime(notification.sent_at)}</dd>
        {notification.resent_from_id && (
          <>
            <dt className="col-5 col-md-4">Reenvío de</dt>
            <dd className="col-7 col-md-8">
              Aviso #{notification.resent_from_id}
              {notification.created_by && ` · por ${notification.created_by.name}`}
            </dd>
          </>
        )}
      </dl>
    </>
  )
}
