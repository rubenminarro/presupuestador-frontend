import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconSearch, IconX } from '@tabler/icons-react'
import { clientName, clientsApi } from '@/features/clients/api'
import { cx } from '@/lib/cx'

export interface ClientOption {
  id: number
  name: string
  /** Teléfono o email, para distinguir homónimos. */
  detail?: string
}

interface ClientPickerProps {
  label?: string
  value: ClientOption | null
  onChange: (client: ClientOption | null) => void
  /** Errores 422 del campo `client_id`. */
  error?: string[]
  required?: boolean
}

/** Búsqueda de cliente por documento, nombre, teléfono o email (mínimo 2 caracteres). */
export function ClientPicker({ label = 'Cliente', value, onChange, error, required }: ClientPickerProps) {
  const inputId = useId()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  const results = useQuery({
    queryKey: ['clients', 'picker', search],
    queryFn: () => clientsApi.list({ search, per_page: 8 }),
    enabled: value === null && search.length >= 2,
  })

  return (
    <div className="mb-3">
      <label className={cx('form-label', required && 'required')} htmlFor={inputId}>
        {label}
      </label>
      {value ? (
        <div className={cx('d-flex align-items-center gap-2 form-control', error && 'is-invalid')}>
          <div className="flex-fill">
            <div>{value.name}</div>
            {value.detail && <div className="small text-secondary">{value.detail}</div>}
          </div>
          <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={() => onChange(null)}>
            <IconX size={16} className="me-1" aria-hidden="true" />
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <div className="input-icon">
            <span className="input-icon-addon">
              <IconSearch size={16} aria-hidden="true" />
            </span>
            <input
              id={inputId}
              type="search"
              className={cx('form-control', error && 'is-invalid')}
              placeholder="Documento, nombre, teléfono o email…"
              autoComplete="off"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </div>
          {search.length >= 2 && (
            <div className="list-group mt-1" role="listbox" aria-label="Clientes encontrados">
              {results.isFetching && <div className="list-group-item text-secondary">Buscando…</div>}
              {!results.isFetching && results.data?.items.length === 0 && (
                <div className="list-group-item text-secondary">No se encontraron clientes.</div>
              )}
              {!results.isFetching &&
                results.data?.items.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="list-group-item list-group-item-action"
                    onClick={() => onChange({ id: client.id, name: clientName(client), detail: `${client.phone} · ${client.email}` })}
                  >
                    <div>{clientName(client)}</div>
                    <div className="small text-secondary">
                      {client.phone} · {client.email}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </>
      )}
      {error?.map((message) => (
        <div key={message} className="invalid-feedback d-block">
          {message}
        </div>
      ))}
    </div>
  )
}
