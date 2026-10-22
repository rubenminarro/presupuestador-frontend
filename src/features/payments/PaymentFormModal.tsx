import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import type { Invoice } from '@/features/invoices/api'
import { PAYMENT_METHODS, paymentsApi, type PaymentMethod } from '@/features/payments/api'
import { formatDate, formatGuarani, todayInput } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/**
 * Pago contra una factura emitida, hasta su saldo. Referencia obligatoria salvo en efectivo; banco en cheque (opcional
 * en transferencia); en efectivo, lo entregado para calcular el vuelto. Los de facturas a crédito llevan recibo.
 */
export function PaymentFormModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const balance = invoice.payment_summary.balance
  const [amount, setAmount] = useState(toInput(Math.round(Number(balance))))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [received, setReceived] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [reference, setReference] = useState('')
  const [bank, setBank] = useState('')
  const [notes, setNotes] = useState('')
  const cash = method === 'cash'

  const mutation = useApiMutation(
    () =>
      paymentsApi.create(invoice.id, {
        amount: toNumber(amount),
        method,
        ...(cash && { amount_received: toNumber(received) }),
        payment_date: nullIfEmpty(paymentDate),
        reference: cash ? null : nullIfEmpty(reference),
        bank: method === 'check' || method === 'transfer' ? nullIfEmpty(bank) : null,
        notes: nullIfEmpty(notes),
      }),
    {
      invalidate: [['invoices'], ['payments']],
      successMessage: 'Pago registrado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)

  // Solo como referencia para el cajero: el vuelto que se guarda lo calcula el backend.
  const amountValue = toNumber(amount)
  const receivedValue = toNumber(received)
  const change = cash && amountValue !== null && receivedValue !== null && receivedValue >= amountValue ? receivedValue - amountValue : null

  return (
    <FormModal title={`Registrar pago · ${invoice.number ?? 'factura'}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Registrar pago">
      <p className="text-secondary">
        Saldo: <strong>{formatGuarani(balance)}</strong> de {formatGuarani(invoice.totals.total)} · {invoice.condition.label}
        {invoice.condition.value === 'credit' && ' (se emite recibo)'}.
      </p>
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Monto (Gs.)"
            name="amount"
            required
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            autoFocus
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <SelectField label="Medio de pago" name="method" required value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} errors={errors}>
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        {cash ? (
          <div className="col-md-6">
            <TextField
              label="Entregado por el cliente (Gs.)"
              name="amount_received"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={received}
              onChange={(event) => setReceived(event.target.value)}
              errors={errors}
              hint={change !== null ? `Vuelto: ${formatGuarani(change)}.` : 'Opcional: vacío si paga el monto exacto.'}
            />
          </div>
        ) : (
          <div className="col-md-6">
            <TextField
              label={method === 'check' ? 'Número de cheque' : method === 'card' ? 'Voucher' : 'Número de operación'}
              name="reference"
              required
              maxLength={100}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              errors={errors}
            />
          </div>
        )}
        {(method === 'check' || method === 'transfer') && (
          <div className="col-md-6">
            <TextField
              label="Banco"
              name="bank"
              required={method === 'check'}
              maxLength={100}
              value={bank}
              onChange={(event) => setBank(event.target.value)}
              errors={errors}
            />
          </div>
        )}
        <div className="col-md-6">
          <TextField
            label="Fecha del pago"
            name="payment_date"
            type="date"
            min={invoice.issue_date ?? undefined}
            max={todayInput()}
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            errors={errors}
            hint={`Vacío: hoy. No antes de la emisión (${formatDate(invoice.issue_date)}).`}
          />
        </div>
      </div>
      <TextareaField label="Notas" name="notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}
