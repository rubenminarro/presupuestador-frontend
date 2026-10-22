import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { PAYMENT_METHODS, type PaymentMethod } from '@/features/payments/api'
import type { Purchase } from '@/features/purchases/api'
import { supplierPaymentsApi } from '@/features/supplier-payments/api'
import { formatDate, formatGuarani, todayInput } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/**
 * Pago contra una compra recibida, hasta su saldo. Referencia obligatoria salvo en efectivo; banco en cheque (opcional
 * en transferencia); sin vuelto. Fecha entre la factura del proveedor y hoy.
 */
export function SupplierPaymentFormModal({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const balance = purchase.payment_summary.balance
  const [amount, setAmount] = useState(toInput(Math.round(Number(balance))))
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [paymentDate, setPaymentDate] = useState('')
  const [reference, setReference] = useState('')
  const [bank, setBank] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [notes, setNotes] = useState('')
  const cash = method === 'cash'

  const mutation = useApiMutation(
    () =>
      supplierPaymentsApi.create(purchase.id, {
        amount: toNumber(amount),
        method,
        payment_date: nullIfEmpty(paymentDate),
        reference: cash ? null : nullIfEmpty(reference),
        bank: method === 'check' || method === 'transfer' ? nullIfEmpty(bank) : null,
        supplier_receipt_number: nullIfEmpty(receiptNumber),
        notes: nullIfEmpty(notes),
      }),
    { invalidate: [['purchases'], ['supplier-payments']], successMessage: 'Pago al proveedor registrado.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Pagar · ${purchase.code}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Registrar pago">
      <p className="text-secondary">
        Saldo: <strong>{formatGuarani(balance)}</strong> de {formatGuarani(purchase.totals.total)} · {purchase.supplier?.name}.
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
        {!cash && (
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
            min={purchase.supplier_document.date ?? undefined}
            max={todayInput()}
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            errors={errors}
            hint={`Vacío: hoy. No antes de la factura (${formatDate(purchase.supplier_document.date)}).`}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Recibo del proveedor"
            name="supplier_receipt_number"
            maxLength={50}
            value={receiptNumber}
            onChange={(event) => setReceiptNumber(event.target.value)}
            errors={errors}
          />
        </div>
      </div>
      <TextareaField label="Notas" name="notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}
