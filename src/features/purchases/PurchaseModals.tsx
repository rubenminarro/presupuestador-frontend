import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { SearchPicker } from '@/components/ui/SearchPicker'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { INVOICE_CONDITIONS, TAX_RATES, type InvoiceCondition, type TaxRate } from '@/features/invoices/api'
import { allowsFractions, partsApi, type Part } from '@/features/parts/api'
import { purchasesApi, type Purchase, type PurchaseItem } from '@/features/purchases/api'
import { useAllSuppliers } from '@/features/suppliers/api'
import { formatMoney, todayInput } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/**
 * Cabecera de la compra (alta o edición del borrador). Número y fecha de la factura del proveedor pueden quedar vacíos en
 * el borrador, pero son obligatorios para recibir.
 */
export function PurchaseFormModal({ purchase, onClose, onSaved }: { purchase: Purchase | null; onClose: () => void; onSaved?: (purchase: Purchase) => void }) {
  const { can } = useAuth()
  const canPickSupplier = can('suppliers.index')
  const suppliers = useAllSuppliers({ active: true, enabled: canPickSupplier })
  const [supplierId, setSupplierId] = useState(toInput(purchase?.supplier?.id))
  const [documentNumber, setDocumentNumber] = useState(purchase?.supplier_document.number ?? '')
  const [documentDate, setDocumentDate] = useState(purchase?.supplier_document.date ?? '')
  const [stampNumber, setStampNumber] = useState(purchase?.supplier_document.stamp_number ?? '')
  const [condition, setCondition] = useState<InvoiceCondition>(purchase?.condition.value ?? 'cash')
  const [dueDate, setDueDate] = useState(purchase?.due_date ?? '')
  const [notes, setNotes] = useState(purchase?.notes ?? '')
  // Se conserva el proveedor actual aunque ya no esté activo (o no se puedan listar).
  const options: { id: number; name: string; tax_id: string | null }[] = [...(suppliers.data ?? [])]
  if (purchase?.supplier && !options.some((supplier) => supplier.id === purchase.supplier?.id)) options.unshift(purchase.supplier)

  const mutation = useApiMutation(
    () => {
      const body = {
        supplier_id: toNumber(supplierId),
        supplier_document_number: nullIfEmpty(documentNumber),
        supplier_document_date: nullIfEmpty(documentDate),
        supplier_stamp_number: nullIfEmpty(stampNumber),
        condition,
        due_date: condition === 'credit' ? nullIfEmpty(dueDate) : null,
        notes: nullIfEmpty(notes),
      }
      return purchase ? purchasesApi.update(purchase.id, body) : purchasesApi.create(body)
    },
    {
      invalidate: [['purchases']],
      successMessage: purchase ? 'Compra actualizada.' : 'Compra creada en borrador.',
      onSuccess: (saved) => {
        onClose()
        onSaved?.(saved)
      },
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={purchase ? `Editar ${purchase.code}` : 'Nueva compra'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      submitLabel={purchase ? 'Guardar' : 'Crear borrador'}
      size="lg"
    >
      <SelectField
        label="Proveedor"
        name="supplier_id"
        required
        value={supplierId}
        onChange={(event) => setSupplierId(event.target.value)}
        errors={errors}
        disabled={!canPickSupplier}
      >
        <option value="">Seleccione un proveedor</option>
        {options.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
            {supplier.tax_id ? ` · ${supplier.tax_id}` : ''}
          </option>
        ))}
      </SelectField>
      <div className="row">
        <div className="col-md-4">
          <TextField
            label="N.º de factura del proveedor"
            name="supplier_document_number"
            maxLength={50}
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            errors={errors}
            hint="Obligatorio para recibir."
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="Fecha de la factura"
            name="supplier_document_date"
            type="date"
            max={todayInput()}
            value={documentDate}
            onChange={(event) => setDocumentDate(event.target.value)}
            errors={errors}
            hint="Obligatoria para recibir."
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="Timbrado del proveedor"
            name="supplier_stamp_number"
            inputMode="numeric"
            maxLength={20}
            value={stampNumber}
            onChange={(event) => setStampNumber(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
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
          <div className="col-md-4">
            <TextField
              label="Vencimiento"
              name="due_date"
              type="date"
              min={documentDate || undefined}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              errors={errors}
              hint="Para recibir: igual o posterior a la factura."
            />
          </div>
        )}
      </div>
      <TextareaField label="Notas" name="notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}

/** Línea del borrador: repuesto, cantidad y costo unitario **con IVA incluido** (como en la factura del proveedor). */
export function PurchaseItemModal({ purchase, item, onClose }: { purchase: Purchase; item: PurchaseItem | null; onClose: () => void }) {
  const [part, setPart] = useState<Part | null>(null)
  const [quantity, setQuantity] = useState(item ? toInput(item.quantity) : '1')
  const [unitCost, setUnitCost] = useState(item ? toInput(item.unit_cost) : '')
  const [taxRate, setTaxRate] = useState<TaxRate>(item?.tax_rate.value ?? 10)

  const mutation = useApiMutation(
    () => {
      const body = { quantity: toNumber(quantity), unit_cost: toNumber(unitCost), tax_rate: taxRate }
      return item ? purchasesApi.updateItem(purchase.id, item.id, body) : purchasesApi.addItem(purchase.id, { ...body, part_id: part?.id ?? null })
    },
    { invalidate: [['purchases']], successMessage: item ? 'Línea actualizada.' : 'Línea agregada.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)
  // Al editar, la unidad del repuesto no viene en la línea: el backend rechaza fracciones donde no van.
  const step = part ? (allowsFractions(part.unit.value) ? '0.001' : '1') : item ? '0.001' : '1'

  return (
    <FormModal
      title={item ? `Editar · ${item.part?.name ?? 'línea'}` : 'Agregar línea'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      {!item && (
        <SearchPicker<Part>
          label="Repuesto"
          required
          queryKey={['parts', 'picker']}
          search={async (text) => (await partsApi.list({ search: text, status: 'active', per_page: 8 })).items}
          value={part}
          onChange={setPart}
          getKey={(option) => option.id}
          renderItem={(option) => (
            <>
              <span className="text-secondary me-1">{option.code}</span>
              {option.name}
              <span className="text-secondary ms-2 small">{option.unit.label}</span>
            </>
          )}
          placeholder="Código, SKU, nombre o marca…"
          emptyMessage="No hay repuestos activos con ese texto."
          error={errors.part_id}
        />
      )}
      <div className="row">
        <div className="col-md-4">
          <TextField
            label="Cantidad"
            name="quantity"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="Costo unitario (con IVA)"
            name="unit_cost"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            errors={errors}
            hint={item ? `Sin IVA: ${formatMoney(item.net_unit_cost)} (calculado).` : undefined}
          />
        </div>
        <div className="col-md-4">
          <SelectField label="IVA" name="tax_rate" required value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value) as TaxRate)} errors={errors}>
            {Object.entries(TAX_RATES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <p className="text-secondary mb-0">El costo sin IVA (lo que entra al inventario) lo calcula el backend al guardar.</p>
    </FormModal>
  )
}
