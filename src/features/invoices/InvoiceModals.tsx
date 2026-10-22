import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField, TextField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { invoiceStampsApi, issuableStamps } from '@/features/invoice-stamps/api'
import { INVOICE_CONDITIONS, invoicesApi, TAX_RATES, type Invoice, type InvoiceCondition, type InvoiceItem, type TaxRate } from '@/features/invoices/api'
import { formatDate, formatGuarani, formatMoney, formatQuantity } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

const INVALIDATE = [['invoices'], ['work-orders']]

/** Datos del cliente y condición del borrador. */
export function EditInvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [name, setName] = useState(invoice.customer.name)
  const [taxId, setTaxId] = useState(invoice.customer.tax_id ?? '')
  const [address, setAddress] = useState(invoice.customer.address ?? '')
  const [condition, setCondition] = useState<InvoiceCondition>(invoice.condition.value)
  const [dueDate, setDueDate] = useState(invoice.due_date ?? '')

  const mutation = useApiMutation(
    () =>
      invoicesApi.update(invoice.id, {
        customer_name: name.trim(),
        customer_tax_id: nullIfEmpty(taxId),
        customer_address: nullIfEmpty(address),
        condition,
        due_date: condition === 'credit' ? nullIfEmpty(dueDate) : null,
      }),
    { invalidate: INVALIDATE, successMessage: 'Factura actualizada.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title="Datos de la factura" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} size="lg">
      <div className="row">
        <div className="col-md-8">
          <TextField
            label="Nombre o razón social"
            name="customer_name"
            required
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="RUC o CI"
            name="customer_tax_id"
            maxLength={30}
            value={taxId}
            onChange={(event) => setTaxId(event.target.value)}
            errors={errors}
            hint="Obligatorio para emitir."
          />
        </div>
      </div>
      <TextField
        label="Dirección"
        name="customer_address"
        maxLength={255}
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        errors={errors}
      />
      <div className="row">
        <div className="col-md-6">
          <SelectField
            label="Condición"
            name="condition"
            required
            value={condition}
            onChange={(event) => setCondition(event.target.value as InvoiceCondition)}
            errors={errors}
          >
            {Object.entries(INVOICE_CONDITIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        {condition === 'credit' && (
          <div className="col-md-6">
            <TextField
              label="Vencimiento"
              name="due_date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              errors={errors}
              hint="Para emitir: hoy o una fecha posterior."
            />
          </div>
        )}
      </div>
    </FormModal>
  )
}

/** Descripción, tasa de IVA y descuento de una línea; el precio con IVA y los totales los recalcula el backend. */
export function InvoiceItemModal({ invoice, item, onClose }: { invoice: Invoice; item: InvoiceItem; onClose: () => void }) {
  const [description, setDescription] = useState(item.description)
  const [taxRate, setTaxRate] = useState<TaxRate>(item.tax_rate.value)
  const [discount, setDiscount] = useState(toInput(Math.round(Number(item.discount))))

  const mutation = useApiMutation(
    () => invoicesApi.updateItem(invoice.id, item.id, { description: description.trim(), tax_rate: taxRate, discount: toNumber(discount) ?? 0 }),
    { invalidate: INVALIDATE, successMessage: 'Línea actualizada.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title="Editar línea" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      <p className="text-secondary">
        {formatQuantity(item.quantity)} × {formatMoney(item.base_unit_price)} sin IVA (precio de la OT). Con la tasa elegida, el
        backend recalcula el precio con IVA incluido.
      </p>
      <TextField
        label="Descripción"
        name="description"
        required
        maxLength={255}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        errors={errors}
      />
      <div className="row">
        <div className="col-6">
          <SelectField
            label="IVA"
            name="tax_rate"
            required
            value={taxRate}
            onChange={(event) => setTaxRate(Number(event.target.value) as TaxRate)}
            errors={errors}
          >
            {Object.entries(TAX_RATES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-6">
          <TextField
            label="Descuento (Gs.)"
            name="discount"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            errors={errors}
            hint={`Importe actual: ${formatGuarani(item.gross_amount)}.`}
          />
        </div>
      </div>
    </FormModal>
  )
}

/**
 * Emitir toma el próximo número del timbrado activo y vigente. Si hay más de uno, hay que elegirlo; quien no puede
 * listar timbrados deja que el backend use el único vigente.
 */
export function IssueInvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { can } = useAuth()
  const canListStamps = can('invoice-stamps.index')
  const stamps = useQuery({ queryKey: ['invoice-stamps'], queryFn: invoiceStampsApi.list, enabled: canListStamps })
  const options = issuableStamps(stamps.data ?? [])
  const [stampId, setStampId] = useState('')
  const selected = options.length === 1 ? options[0] : options.find((stamp) => String(stamp.id) === stampId)

  const mutation = useApiMutation(() => invoicesApi.issue(invoice.id, selected?.id ?? null), {
    invalidate: [...INVALIDATE, ['invoice-stamps']],
    successMessage: 'Factura emitida.',
    onSuccess: onClose,
  })
  const errors = validationErrors(mutation.error)

  // Avisos de UX: el backend valida lo mismo (INVOICE_CUSTOMER_TAX_ID_REQUIRED, INVOICE_DUE_DATE_REQUIRED).
  const warnings = [
    !invoice.customer.tax_id && 'Falta el RUC o CI del cliente.',
    invoice.condition.value === 'credit' && !invoice.due_date && 'Una factura a crédito necesita fecha de vencimiento.',
    canListStamps && stamps.data && options.length === 0 && 'No hay un timbrado activo y vigente hoy.',
  ].filter(Boolean)

  return (
    <FormModal title="Emitir factura" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Emitir">
      <p>
        Al emitirla, la factura toma número y fecha de hoy y ya no se puede modificar: solo anular. Total{' '}
        <strong>{formatGuarani(invoice.totals.total)}</strong> ({invoice.condition.label.toLowerCase()}).
      </p>
      {warnings.length > 0 && (
        <div className="alert alert-warning">
          {warnings.map((warning) => (
            <div key={String(warning)}>{warning}</div>
          ))}
        </div>
      )}
      {options.length > 1 && (
        <SelectField
          label="Timbrado"
          name="invoice_stamp_id"
          required
          value={stampId}
          onChange={(event) => setStampId(event.target.value)}
          errors={errors}
        >
          <option value="">Seleccione un timbrado</option>
          {options.map((stamp) => (
            <option key={stamp.id} value={stamp.id}>
              {stamp.stamp_number} · {stamp.establishment}-{stamp.expedition_point} · próximo {stamp.next_invoice_number}
            </option>
          ))}
        </SelectField>
      )}
      {selected && (
        <div className="text-secondary">
          Timbrado {selected.stamp_number} (vence el {formatDate(selected.valid_until)}): número {selected.next_invoice_number}.
        </div>
      )}
    </FormModal>
  )
}
