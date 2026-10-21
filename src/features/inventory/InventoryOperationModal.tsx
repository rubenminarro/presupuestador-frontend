import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { EXIT_TYPES, inventoryApi, MOVEMENT_TYPE } from '@/features/inventory/api'
import { allowsFractions, type Part } from '@/features/parts/api'
import { useAllSuppliers } from '@/features/suppliers/api'
import { formatQuantity } from '@/lib/format'
import { nullIfEmpty, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

export type InventoryOperation = 'entry' | 'exit' | 'adjust'

interface InventoryOperationModalProps {
  operation: InventoryOperation
  part: Pick<Part, 'id' | 'code' | 'name' | 'unit'>
  /** Saldos actuales, solo para mostrar (el backend valida contra el disponible). */
  stock?: { on_hand: string; available: string }
  onClose: () => void
}

const TITLES: Record<InventoryOperation, string> = {
  entry: 'Stock inicial',
  exit: 'Salida de stock',
  adjust: 'Ajuste por conteo',
}

/**
 * Entrada inicial (una vez por repuesto; las compras entran por su módulo), salida manual (devolución a proveedor o
 * baja) y ajuste por conteo físico. Saldos, costo promedio y validaciones de stock los resuelve el backend.
 */
export function InventoryOperationModal({ operation, part, stock, onClose }: InventoryOperationModalProps) {
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [exitType, setExitType] = useState<string>('loss')
  const [supplierId, setSupplierId] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [reason, setReason] = useState('')
  const needsSupplier = operation === 'entry' || (operation === 'exit' && exitType === 'supplier_return')
  const suppliers = useAllSuppliers({ active: true, enabled: needsSupplier })

  const mutation = useApiMutation(
    () => {
      if (operation === 'entry') {
        return inventoryApi.entry({
          part_id: part.id,
          type: 'initial',
          quantity: toNumber(quantity),
          unit_cost: toNumber(unitCost),
          supplier_id: toNumber(supplierId),
          document_number: nullIfEmpty(documentNumber),
          reason: nullIfEmpty(reason),
        })
      }
      if (operation === 'exit') {
        return inventoryApi.exit({
          part_id: part.id,
          type: exitType,
          quantity: toNumber(quantity),
          supplier_id: exitType === 'supplier_return' ? toNumber(supplierId) : null,
          document_number: nullIfEmpty(documentNumber),
          reason: reason.trim(),
        })
      }
      return inventoryApi.adjust({
        part_id: part.id,
        counted_quantity: toNumber(quantity),
        unit_cost: toNumber(unitCost),
        reason: reason.trim(),
      })
    },
    {
      invalidate: [['inventory'], ['parts']],
      successMessage: operation === 'entry' ? 'Stock inicial registrado.' : operation === 'exit' ? 'Salida registrada.' : 'Ajuste registrado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)
  const step = allowsFractions(part.unit.value) ? '0.001' : '1'
  const quantityHint = allowsFractions(part.unit.value)
    ? `En ${part.unit.label.toLowerCase()}; hasta 3 decimales.`
    : `En ${part.unit.label.toLowerCase()}; solo enteros.`

  return (
    <FormModal
      title={TITLES[operation]}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      submitLabel="Registrar"
    >
      <div className="mb-3">
        <div className="text-secondary small">{part.code}</div>
        <div className="fw-medium">{part.name}</div>
        {stock && (
          <div className="small text-secondary">
            En stock: {formatQuantity(stock.on_hand)} · Disponible: {formatQuantity(stock.available)}
          </div>
        )}
      </div>

      {operation === 'exit' && (
        <SelectField label="Tipo de salida" name="type" required value={exitType} onChange={(event) => setExitType(event.target.value)} errors={errors}>
          {EXIT_TYPES.map((type) => (
            <option key={type} value={type}>
              {MOVEMENT_TYPE[type].label}
            </option>
          ))}
        </SelectField>
      )}

      <div className="row">
        <div className="col-sm-6">
          <TextField
            label={operation === 'adjust' ? 'Cantidad contada' : 'Cantidad'}
            name={operation === 'adjust' ? 'counted_quantity' : 'quantity'}
            required
            autoFocus
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            errors={errors}
            hint={operation === 'adjust' ? `Existencia física total. ${quantityHint}` : quantityHint}
          />
        </div>
        {operation !== 'exit' && (
          <div className="col-sm-6">
            <TextField
              label="Costo unitario (sin IVA)"
              name="unit_cost"
              required={operation === 'entry'}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.0001"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              errors={errors}
              hint={operation === 'adjust' ? 'Opcional; solo se usa si el conteo da más que el stock.' : 'En guaraníes, sin IVA.'}
            />
          </div>
        )}
      </div>

      {needsSupplier && (
        <SelectField
          label="Proveedor"
          name="supplier_id"
          required={operation === 'exit'}
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          errors={errors}
        >
          <option value="">{operation === 'entry' ? 'Sin proveedor' : 'Seleccione un proveedor'}</option>
          {suppliers.data?.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </SelectField>
      )}

      {operation !== 'adjust' && (
        <TextField
          label="Número de documento"
          name="document_number"
          maxLength={50}
          value={documentNumber}
          onChange={(event) => setDocumentNumber(event.target.value)}
          errors={errors}
        />
      )}

      <TextareaField
        label="Motivo"
        name="reason"
        required={operation !== 'entry'}
        rows={2}
        maxLength={1000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        errors={errors}
      />

      {operation === 'entry' && (
        <div className="small text-secondary">El stock inicial se registra una sola vez por repuesto; después el stock entra por compras.</div>
      )}
      {operation === 'adjust' && (
        <div className="small text-secondary">Se registra la diferencia contra el stock actual como ajuste positivo o negativo.</div>
      )}
    </FormModal>
  )
}
