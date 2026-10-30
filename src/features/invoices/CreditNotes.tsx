import { useState } from 'react'
import { IconBan, IconReceiptRefund } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TextareaField, TextField } from '@/components/ui/FormField'
import { FormModal } from '@/components/ui/FormModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { CREDIT_NOTE_STATUS, creditableByItem, creditNoteInput, creditNotesApi, type CreditNote, type Invoice } from '@/features/invoices/api'
import { formatDate, formatDateTime, formatGuarani, todayInput } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/**
 * Notas de crédito emitidas fuera del sistema (talonario u otro sistema) y registradas sobre la factura (P10). Se
 * registran con la factura emitida, por línea y hasta el saldo; un registro mal cargado se anula con motivo.
 */
export function CreditNotesCard({ invoice }: { invoice: Invoice }) {
  const { can } = useAuth()
  const [registering, setRegistering] = useState(false)
  const [cancelling, setCancelling] = useState<CreditNote | null>(null)
  const notes = invoice.credit_notes ?? []
  const canRegister = invoice.status.value === 'issued' && Number(invoice.payment_summary.balance) > 0 && can('invoice-credit-notes.store')

  const cancel = useApiMutation((reason: string) => creditNotesApi.cancel(invoice.id, cancelling?.id ?? 0, reason), {
    invalidate: [['invoices'], ['work-orders']],
    successMessage: 'Nota de crédito anulada.',
    onSuccess: () => setCancelling(null),
  })

  if (notes.length === 0 && !canRegister) return null

  return (
    <div className="card mt-3">
      <div className="card-header">
        <h3 className="card-title">Notas de crédito</h3>
        {canRegister && (
          <div className="card-actions">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setRegistering(true)}>
              <IconReceiptRefund size={16} className="me-1" aria-hidden="true" />
              Registrar nota de crédito
            </button>
          </div>
        )}
      </div>
      {notes.length === 0 ? (
        <div className="card-body text-secondary small">
          Sin notas de crédito. SyncTaller no las emite: se registra la emitida en el talonario u otro sistema.
        </div>
      ) : (
        <div className="list-group list-group-flush">
          {notes.map((note) => (
            <div key={note.id} className="list-group-item">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <strong>{note.number}</strong>
                {note.stamp_number && <span className="small text-secondary">timbrado {note.stamp_number}</span>}
                <span className="small text-secondary">{formatDate(note.issue_date)}</span>
                <StatusBadge value={note.status.value} map={CREDIT_NOTE_STATUS} />
                <span className="ms-auto fw-bold">{formatGuarani(note.total)}</span>
                {note.status.value === 'registered' && can('invoice-credit-notes.cancel') && (
                  <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => setCancelling(note)}>
                    <IconBan size={16} className="me-1" aria-hidden="true" />
                    Anular
                  </button>
                )}
              </div>
              <div className="small mt-1">{note.reason}</div>
              {(note.items ?? []).map((line) => (
                <div key={line.id} className="small text-secondary d-flex justify-content-between">
                  <span>{line.description}</span>
                  <span>{formatGuarani(line.amount)}</span>
                </div>
              ))}
              <div className="small text-secondary mt-1">
                Registrada {formatDateTime(note.created_at)}
                {note.registered_by && ` por ${note.registered_by.name}`}
              </div>
              {note.status.value === 'cancelled' && (
                <div className="small text-red">
                  Anulada {formatDateTime(note.cancelled_at)}
                  {note.cancelled_by && ` por ${note.cancelled_by.name}`}: {note.cancellation_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {registering && <CreditNoteFormModal invoice={invoice} onClose={() => setRegistering(false)} />}
      <ConfirmDialog
        open={cancelling !== null}
        title="Anular nota de crédito"
        message={
          <>
            ¿Anular el registro de la nota <strong>{cancelling?.number}</strong>? El saldo de la factura vuelve a incluir lo
            acreditado. Es definitivo.
          </>
        }
        confirmLabel="Anular"
        variant="danger"
        reason={{ label: 'Motivo de la anulación' }}
        isLoading={cancel.isPending}
        error={cancel.error}
        onConfirm={(reason) => cancel.mutate(reason ?? '')}
        onClose={() => setCancelling(null)}
      />
    </div>
  )
}

export function CreditNoteFormModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const remaining = creditableByItem(invoice)
  const items = (invoice.items ?? []).filter((item) => (remaining[item.id] ?? 0) > 0)
  const [values, setValues] = useState({ number: '', stamp_number: '', issue_date: todayInput(), reason: '' })
  const [amounts, setAmounts] = useState<Record<number, string>>({})
  const body = creditNoteInput(values, amounts)
  const total = body.items.reduce((sum, item) => sum + item.amount, 0)
  const balance = Number(invoice.payment_summary.balance)

  const mutation = useApiMutation(() => creditNotesApi.create(invoice.id, body), {
    invalidate: [['invoices'], ['work-orders']],
    successMessage: 'Nota de crédito registrada.',
    onSuccess: onClose,
  })
  const errors = validationErrors(mutation.error)
  const itemErrors = Object.entries(errors).filter(([field]) => field.startsWith('items'))
  const set = (field: keyof typeof values) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [field]: event.target.value }))

  return (
    <FormModal
      title={`Registrar nota de crédito · ${invoice.number}`}
      size="lg"
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      submitLabel="Registrar"
    >
      <p className="text-secondary">
        Cargue la nota tal como se emitió fuera del sistema. Se acredita por línea, hasta el saldo de la factura
        ({formatGuarani(balance)}); para acreditar algo cobrado, primero se anula el pago.
      </p>
      <div className="row">
        <div className="col-12 col-md-4">
          <TextField label="Número" name="number" required maxLength={30} value={values.number} onChange={set('number')} errors={errors} />
        </div>
        <div className="col-12 col-md-4">
          <TextField label="Timbrado" name="stamp_number" maxLength={30} value={values.stamp_number} onChange={set('stamp_number')} errors={errors} />
        </div>
        <div className="col-12 col-md-4">
          <TextField label="Fecha" name="issue_date" type="date" required max={todayInput()} value={values.issue_date} onChange={set('issue_date')} errors={errors} />
        </div>
      </div>
      <TextareaField label="Motivo" name="reason" required rows={2} minLength={3} maxLength={1000} value={values.reason} onChange={set('reason')} errors={errors} />

      <div className="table-responsive">
        <table className="table table-vcenter table-sm mb-0">
          <thead>
            <tr>
              <th>Línea</th>
              <th className="text-end">Le queda</th>
              <th className="text-end">A acreditar (IVA incluido)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.description}
                  <div className="small text-secondary">{item.tax_rate.label}</div>
                </td>
                <td className="text-end text-nowrap">{formatGuarani(remaining[item.id])}</td>
                <td className="text-end" style={{ minWidth: '12rem' }}>
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      min={0}
                      max={remaining[item.id]}
                      step={1}
                      className="form-control text-end"
                      aria-label={`Importe a acreditar: ${item.description}`}
                      value={amounts[item.id] ?? ''}
                      onChange={(event) => setAmounts((current) => ({ ...current, [item.id]: event.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setAmounts((current) => ({ ...current, [item.id]: String(remaining[item.id]) }))}
                    >
                      Todo
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fw-bold">
              <td colSpan={2}>Total de la nota</td>
              <td className={`text-end ${total > balance ? 'text-red' : ''}`}>{formatGuarani(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {total > balance && <div className="text-red small mt-1">Supera el saldo de la factura.</div>}
      {itemErrors.length > 0 && <div className="text-red small mt-1">{itemErrors[0][1][0]}</div>}
    </FormModal>
  )
}
