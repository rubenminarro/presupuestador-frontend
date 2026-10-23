import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import {
  AUDIT_EVENTS,
  AUDITABLE_TYPES,
  auditableLabel,
  auditableLink,
  auditLogsApi,
  type AuditEvent,
  type AuditLog,
  type AuditLogDetail,
  type AuditValues,
} from '@/features/audit-logs/api'
import { usersApi } from '@/features/users/api'
import { formatDateTime } from '@/lib/format'

/** Registro inmutable de cambios (solo administrador). Admite `?auditable_type=…&auditable_id=…` para enlazar una entidad. */
export function AuditLogsPage() {
  const { can } = useAuth()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [auditableType, setAuditableType] = useState(searchParams.get('auditable_type') ?? '')
  const [auditableId, setAuditableId] = useState(searchParams.get('auditable_id') ?? '')
  const [userId, setUserId] = useState('')
  const [event, setEvent] = useState<AuditEvent | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const users = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => (await usersApi.list({ per_page: 1000 })).items,
    enabled: can('users.index'),
    staleTime: 5 * 60_000,
  })

  // El id solo filtra junto con la entidad (los ids se repiten entre tablas).
  const params = {
    page,
    per_page: 20,
    auditable_type: auditableType,
    auditable_id: auditableType && /^\d+$/.test(auditableId) ? auditableId : '',
    user_id: userId,
    event,
    date_from: dateFrom,
    date_to: dateTo,
  }
  const query = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditLogsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const columns: Column<AuditLog>[] = [
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (log) => formatDateTime(log.created_at) },
    { key: 'event', header: 'Evento', render: (log) => <StatusBadge value={log.event.value} map={AUDIT_EVENTS} /> },
    {
      key: 'entity',
      header: 'Entidad',
      className: 'text-nowrap',
      render: (log) => {
        const link = auditableLink(log)
        return link ? (
          <Link to={link} onClick={(click) => click.stopPropagation()}>
            {auditableLabel(log)}
          </Link>
        ) : (
          auditableLabel(log)
        )
      },
    },
    { key: 'user', header: 'Usuario', render: (log) => log.user?.name ?? <span className="text-secondary">—</span> },
    { key: 'changes', header: 'Campos', render: (log) => <ChangedFields log={log} /> },
    { key: 'ip', header: 'IP', className: 'text-nowrap text-secondary', render: (log) => log.ip_address ?? '—' },
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Auditoría"
        actions={
          <div className="d-flex flex-wrap gap-2">
            <input
              type="date"
              className="form-control w-auto"
              aria-label="Desde"
              title="Desde"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(change) => filter(setDateFrom)(change.target.value)}
            />
            <input
              type="date"
              className="form-control w-auto"
              aria-label="Hasta"
              title="Hasta"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(change) => filter(setDateTo)(change.target.value)}
            />
          </div>
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(log) => log.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={setPage}
          onRowClick={(log) => setSelected(log.id)}
          emptyMessage="No hay registros con esos filtros."
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por entidad"
                value={auditableType}
                onChange={(change) => filter(setAuditableType)(change.target.value)}
              >
                <option value="">Todas las entidades</option>
                {Object.entries(AUDITABLE_TYPES)
                  .sort(([, a], [, b]) => a.localeCompare(b))
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
              {auditableType && (
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm"
                  style={{ width: '7rem' }}
                  placeholder="ID"
                  aria-label="ID de la entidad"
                  value={auditableId}
                  onChange={(change) => filter(setAuditableId)(change.target.value)}
                />
              )}
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por evento"
                value={event}
                onChange={(change) => filter(setEvent)(change.target.value as AuditEvent | '')}
              >
                <option value="">Todos los eventos</option>
                {Object.entries(AUDIT_EVENTS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {can('users.index') && (
                <select
                  className="form-select form-select-sm w-auto"
                  aria-label="Filtrar por usuario"
                  value={userId}
                  onChange={(change) => filter(setUserId)(change.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {users.data?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          }
        />
      </PageBody>
      {selected !== null && <AuditLogModal logId={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

function changedKeys(log: Pick<AuditLog, 'old_values' | 'new_values'>): string[] {
  return [...new Set([...Object.keys(log.old_values ?? {}), ...Object.keys(log.new_values ?? {})])]
}

function ChangedFields({ log }: { log: AuditLog }) {
  const keys = changedKeys(log)
  if (keys.length === 0) return <span className="text-secondary">—</span>
  const shown = keys.slice(0, 4)
  return (
    <span className="small">
      {shown.map((key) => (
        <code key={key} className="me-1">
          {key}
        </code>
      ))}
      {keys.length > shown.length && <span className="text-secondary">+{keys.length - shown.length}</span>}
    </span>
  )
}

function AuditLogModal({ logId, onClose }: { logId: number; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['audit-logs', 'detail', logId], queryFn: () => auditLogsApi.show(logId) })

  return (
    <Modal
      open
      title={`Registro de auditoría #${logId}`}
      onClose={onClose}
      size="lg"
      footer={
        <button type="button" className="btn btn-link link-secondary ms-auto" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      {detail.data ? (
        <AuditLogDetailView log={detail.data} />
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      ) : (
        <LoadingState />
      )}
    </Modal>
  )
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return <span className="text-secondary">—</span>
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return <code className="text-wrap">{JSON.stringify(value)}</code>
  return String(value)
}

function AuditLogDetailView({ log }: { log: AuditLogDetail }) {
  const link = auditableLink(log)
  const keys = changedKeys(log)
  const value = (values: AuditValues, key: string) => (values && key in values ? values[key] : undefined)

  return (
    <>
      <dl className="row">
        <dt className="col-4 col-md-3">Evento</dt>
        <dd className="col-8 col-md-9">
          <StatusBadge value={log.event.value} map={AUDIT_EVENTS} />
        </dd>
        <dt className="col-4 col-md-3">Entidad</dt>
        <dd className="col-8 col-md-9">{link ? <Link to={link}>{auditableLabel(log)}</Link> : auditableLabel(log)}</dd>
        <dt className="col-4 col-md-3">Usuario</dt>
        <dd className="col-8 col-md-9">{log.user ? `${log.user.name} (${log.user.email})` : '—'}</dd>
        <dt className="col-4 col-md-3">Fecha</dt>
        <dd className="col-8 col-md-9">{formatDateTime(log.created_at)}</dd>
        <dt className="col-4 col-md-3">IP</dt>
        <dd className="col-8 col-md-9">{log.ip_address ?? '—'}</dd>
        <dt className="col-4 col-md-3">Navegador</dt>
        <dd className="col-8 col-md-9 small text-secondary text-break">{log.user_agent ?? '—'}</dd>
      </dl>
      {keys.length === 0 ? (
        <p className="text-secondary mb-0">Este evento no registra cambios de campos.</p>
      ) : (
        <div className="table-responsive position-relative border rounded">
          <table className="table table-sm table-vcenter mb-0">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Antes</th>
                <th>Después</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key}>
                  <td>
                    <code>{key}</code>
                  </td>
                  <td className="text-break">{formatValue(value(log.old_values, key))}</td>
                  <td className="text-break">{formatValue(value(log.new_values, key))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
