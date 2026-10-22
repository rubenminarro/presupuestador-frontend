import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import {
  CHECKLIST_STATUS,
  CHECKLIST_VALUES,
  receptionsApi,
  type ReceptionCheckList,
  type ReceptionCheckListItem,
} from '@/features/receptions/api'
import { cx } from '@/lib/cx'
import { nullIfEmpty, toInput } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

interface ReceptionCheckListCardProps {
  checkListId: number
  /** Solo con la recepción `pending` (procesada → `RECEPTION_CHECKLIST_NOT_EDITABLE`). */
  editable: boolean
}

export function ReceptionCheckListCard({ checkListId, editable }: ReceptionCheckListCardProps) {
  const query = useQuery({
    queryKey: ['receptions', 'check-list', checkListId],
    queryFn: () => receptionsApi.checkList(checkListId),
  })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Checklist</h3>
        {query.data && (
          <div className="card-actions">
            <StatusBadge value={query.data.status} map={CHECKLIST_STATUS} />
          </div>
        )}
      </div>
      {query.data ? (
        // key: al guardar llega un checklist nuevo y el formulario se reinicia con sus valores.
        <CheckListForm key={query.data.items.map((item) => `${item.id}:${String(item.value)}`).join()} checkList={query.data} editable={editable} />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <LoadingState />
      )}
    </div>
  )
}

type Draft = Record<number, { value: string; observation: string }>

/** Valor de la API a texto del control (los booleanos se guardan como "1"/"0"). */
function valueToInput(item: ReceptionCheckListItem): string {
  if (item.value === null) return ''
  if (item.type === 'boolean') return item.value === true || item.value === '1' || item.value === 1 ? '1' : '0'
  return toInput(item.value as string | number)
}

/** Texto del control al valor que valida el backend según el tipo. */
function inputToValue(type: ReceptionCheckListItem['type'], value: string): string | number | boolean | null {
  if (value === '') return null
  if (type === 'boolean') return value === '1'
  if (type === 'number') return Number(value.replace(',', '.'))
  return value
}

function CheckListForm({ checkList, editable }: { checkList: ReceptionCheckList; editable: boolean }) {
  const { can } = useAuth()
  const canEdit = editable && can('reception-check-lists.update')
  const [draft, setDraft] = useState<Draft>(() =>
    Object.fromEntries(checkList.items.map((item) => [item.id, { value: valueToInput(item), observation: item.observation ?? '' }])),
  )

  const mutation = useApiMutation(
    () =>
      receptionsApi.updateCheckList(
        checkList.id,
        checkList.items.map((item) => ({
          id: item.id,
          value: inputToValue(item.type, draft[item.id].value),
          observation: nullIfEmpty(draft[item.id].observation),
        })),
      ),
    { invalidate: [['receptions']], successMessage: 'Checklist guardado.' },
  )
  const errors = validationErrors(mutation.error)

  if (checkList.items.length === 0) {
    return <div className="card-body text-secondary">Las categorías de la recepción no tienen ítems de checklist.</div>
  }

  const set = (id: number, field: 'value' | 'observation', value: string) =>
    setDraft((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))

  return (
    <>
      <div className="table-responsive">
        <table className="table card-table table-vcenter">
          <thead>
            <tr>
              <th>Ítem</th>
              <th style={{ width: '11rem' }}>Valor</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            {checkList.items.map((item, index) => {
              const valueError = errors[`items.${index}.value`]
              const observationError = errors[`items.${index}.observation`]
              const label = `${item.name}`
              return (
                <tr key={item.id}>
                  <td>
                    <span className={cx(Boolean(item.required) && 'required')}>{item.name}</span>
                  </td>
                  <td>
                    {item.type === 'number' ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        className={cx('form-control form-control-sm', valueError && 'is-invalid')}
                        aria-label={`Valor de ${label}`}
                        disabled={!canEdit}
                        value={draft[item.id].value}
                        onChange={(event) => set(item.id, 'value', event.target.value)}
                      />
                    ) : (
                      <select
                        className={cx('form-select form-select-sm', valueError && 'is-invalid')}
                        aria-label={`Valor de ${label}`}
                        disabled={!canEdit}
                        value={draft[item.id].value}
                        onChange={(event) => set(item.id, 'value', event.target.value)}
                      >
                        <option value="">—</option>
                        {item.type === 'boolean' ? (
                          <>
                            <option value="1">Sí</option>
                            <option value="0">No</option>
                          </>
                        ) : (
                          Object.entries(CHECKLIST_VALUES).map(([value, text]) => (
                            <option key={value} value={value}>
                              {text}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                    {valueError?.map((message) => (
                      <div key={message} className="invalid-feedback d-block">
                        {message}
                      </div>
                    ))}
                  </td>
                  <td>
                    <input
                      type="text"
                      className={cx('form-control form-control-sm', observationError && 'is-invalid')}
                      aria-label={`Observación de ${label}`}
                      maxLength={500}
                      disabled={!canEdit}
                      value={draft[item.id].observation}
                      onChange={(event) => set(item.id, 'observation', event.target.value)}
                    />
                    {observationError?.map((message) => (
                      <div key={message} className="invalid-feedback d-block">
                        {message}
                      </div>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="card-footer d-flex align-items-center gap-2">
        <span className="small text-secondary me-auto">
          {canEdit ? 'Los ítems marcados son obligatorios.' : editable ? 'Solo lectura.' : 'La recepción ya está procesada: el checklist no se modifica.'}
        </span>
        {canEdit && (
          <button type="button" className="btn btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            Guardar checklist
          </button>
        )}
      </div>
    </>
  )
}
