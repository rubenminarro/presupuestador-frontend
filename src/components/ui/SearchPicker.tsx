import { useEffect, useId, useState, type ReactNode } from 'react'
import { useQuery, type QueryKey } from '@tanstack/react-query'
import { IconSearch, IconX } from '@tabler/icons-react'
import { cx } from '@/lib/cx'

interface SearchPickerProps<T> {
  label: string
  /** Prefijo de la query key; se le suma el texto buscado. */
  queryKey: QueryKey
  search: (text: string) => Promise<T[]>
  value: T | null
  onChange: (value: T | null) => void
  getKey: (item: T) => string | number
  /** Contenido de cada resultado y del valor elegido. */
  renderItem: (item: T) => ReactNode
  placeholder?: string
  emptyMessage?: string
  /** Errores 422 del campo. */
  error?: string[]
  required?: boolean
  disabled?: boolean
}

/** Búsqueda con resultados en lista (mínimo 2 caracteres, espera a que se deje de escribir). */
export function SearchPicker<T>({
  label,
  queryKey,
  search,
  value,
  onChange,
  getKey,
  renderItem,
  placeholder = 'Buscar…',
  emptyMessage = 'Sin resultados.',
  error,
  required,
  disabled,
}: SearchPickerProps<T>) {
  const inputId = useId()
  const [input, setInput] = useState('')
  const [text, setText] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setText(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  const results = useQuery({
    queryKey: [...queryKey, text],
    queryFn: () => search(text),
    enabled: value === null && text.length >= 2,
  })

  return (
    <div className="mb-3">
      <label className={cx('form-label', required && 'required')} htmlFor={inputId}>
        {label}
      </label>
      {value ? (
        <div className={cx('d-flex align-items-center gap-2 form-control', error && 'is-invalid')}>
          <div className="flex-fill">{renderItem(value)}</div>
          {!disabled && (
            <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={() => onChange(null)}>
              <IconX size={16} className="me-1" aria-hidden="true" />
              Cambiar
            </button>
          )}
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
              placeholder={placeholder}
              autoComplete="off"
              disabled={disabled}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </div>
          {text.length >= 2 && (
            <div className="list-group mt-1" role="listbox" aria-label={`${label}: resultados`}>
              {results.isFetching && <div className="list-group-item text-secondary">Buscando…</div>}
              {!results.isFetching && results.data?.length === 0 && <div className="list-group-item text-secondary">{emptyMessage}</div>}
              {!results.isFetching &&
                results.data?.map((item) => (
                  <button
                    key={getKey(item)}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="list-group-item list-group-item-action"
                    onClick={() => onChange(item)}
                  >
                    {renderItem(item)}
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
