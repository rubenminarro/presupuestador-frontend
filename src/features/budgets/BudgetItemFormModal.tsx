import { useState } from 'react'
import { FormModal } from '@/components/ui/FormModal'
import { SearchPicker } from '@/components/ui/SearchPicker'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { BUDGET_ITEM_TYPES, budgetsApi, type BudgetItem, type BudgetItemInput, type BudgetItemType } from '@/features/budgets/api'
import { allowsFractions, partsApi, type PartUnit } from '@/features/parts/api'
import { servicesApi } from '@/features/services/api'
import { formatMoney } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/** Repuesto o servicio elegido; `unit` y `price` solo se conocen si se eligió en esta edición. */
interface CatalogOption {
  id: number
  code: string
  name: string
  unit?: { value: PartUnit; label: string }
  /** Precio de venta (repuesto) o estándar (servicio), sin IVA. */
  price?: string
}

interface BudgetItemFormModalProps {
  budgetId: number
  /** null: alta. */
  item: BudgetItem | null
  onClose: () => void
}

/**
 * Ítem `labor | service | part`. Precios sin IVA; el total del ítem y del presupuesto los calcula el backend. Al
 * elegir un repuesto o servicio se sugieren su nombre y su precio (se pueden cambiar).
 */
export function BudgetItemFormModal({ budgetId, item, onClose }: BudgetItemFormModalProps) {
  const [type, setType] = useState<BudgetItemType>(item?.type ?? 'labor')
  const [catalog, setCatalog] = useState<CatalogOption | null>(item?.part ?? item?.service ?? null)
  const [description, setDescription] = useState(item?.description ?? '')
  const [quantity, setQuantity] = useState(item ? toInput(item.quantity) : '1')
  const [unitPrice, setUnitPrice] = useState(toInput(item?.unit_price))
  const [hours, setHours] = useState(toInput(item?.estimated_hours))
  const [notes, setNotes] = useState(item?.notes ?? '')

  const pick = (option: CatalogOption | null) => {
    setCatalog(option)
    if (!option) return
    setDescription(option.name)
    // Servicio: sin precio usa el estándar del catálogo; se deja vacío para que lo resuelva el backend.
    setUnitPrice(type === 'part' && option.price ? toInput(option.price) : '')
  }

  const mutation = useApiMutation(
    () => {
      const body: BudgetItemInput = {
        description: description.trim(),
        quantity: toNumber(quantity),
        notes: nullIfEmpty(notes),
        ...(type === 'part' && { part_id: catalog?.id ?? null }),
        ...(type === 'service' && { service_id: catalog?.id ?? null }),
        // Servicio del catálogo: precio y horas vacíos se omiten (el backend toma los del catálogo).
        ...(type === 'service' && catalog && unitPrice.trim() === '' ? {} : { unit_price: toNumber(unitPrice) }),
        ...(type !== 'part' && !(type === 'service' && catalog && hours.trim() === '') && { estimated_hours: toNumber(hours) }),
      }
      return item ? budgetsApi.updateItem(budgetId, item.id, body) : budgetsApi.createItem(budgetId, { ...body, type })
    },
    {
      invalidate: [['budgets']],
      successMessage: item ? 'Ítem actualizado.' : 'Ítem agregado.',
      onSuccess: onClose,
    },
  )
  const errors = validationErrors(mutation.error)
  const step = type === 'part' && catalog?.unit ? (allowsFractions(catalog.unit.value) ? '0.01' : '1') : '0.01'

  return (
    <FormModal
      title={item ? 'Editar ítem' : 'Nuevo ítem'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        <div className="col-md-4">
          <SelectField
            label="Tipo"
            name="type"
            required
            disabled={item !== null}
            value={type}
            onChange={(event) => {
              setType(event.target.value as BudgetItemType)
              setCatalog(null)
            }}
            errors={errors}
            hint={item ? 'El tipo no se cambia al editar.' : undefined}
          >
            {Object.entries(BUDGET_ITEM_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-8">
          {type === 'part' && (
            <SearchPicker<CatalogOption>
              label="Repuesto"
              required
              queryKey={['parts', 'picker']}
              search={async (text) =>
                (await partsApi.list({ search: text, status: 'active', per_page: 8 })).items.map((part) => ({
                  id: part.id,
                  code: part.code,
                  name: part.name,
                  unit: part.unit,
                  price: part.sale_price,
                }))
              }
              value={catalog}
              onChange={pick}
              getKey={(option) => option.id}
              renderItem={(option) => (
                <>
                  <span className="text-secondary me-1">{option.code}</span>
                  {option.name}
                  {option.price && <span className="text-secondary ms-2 small">{formatMoney(option.price)} · {option.unit?.label}</span>}
                </>
              )}
              placeholder="Código, SKU, nombre o marca…"
              emptyMessage="No hay repuestos activos con ese texto."
              error={errors.part_id}
            />
          )}
          {type === 'service' && (
            <SearchPicker<CatalogOption>
              label="Servicio del catálogo"
              queryKey={['services', 'picker']}
              search={async (text) =>
                (await servicesApi.list({ search: text, status: 'active', per_page: 8 })).items.map((service) => ({
                  id: service.id,
                  code: service.code,
                  name: service.name,
                  price: service.standard_price,
                }))
              }
              value={catalog}
              onChange={pick}
              getKey={(option) => option.id}
              renderItem={(option) => (
                <>
                  <span className="text-secondary me-1">{option.code}</span>
                  {option.name}
                  {option.price && <span className="text-secondary ms-2 small">{formatMoney(option.price)}</span>}
                </>
              )}
              placeholder="Código o nombre…"
              emptyMessage="No hay servicios activos con ese texto."
              error={errors.service_id}
            />
          )}
        </div>
      </div>
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
        <div className="col-md-4">
          <TextField
            label="Cantidad"
            name="quantity"
            required
            type="number"
            inputMode="decimal"
            min={0.01}
            step={step}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <TextField
            label="Precio unitario (sin IVA)"
            name="unit_price"
            required={!(type === 'service' && catalog)}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            errors={errors}
            hint={type === 'service' && catalog ? 'Vacío: precio estándar del servicio.' : undefined}
          />
        </div>
        {type !== 'part' && (
          <div className="col-md-4">
            <TextField
              label="Horas estimadas"
              name="estimated_hours"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              errors={errors}
              hint={type === 'service' && catalog ? 'Vacío: horas del catálogo × cantidad.' : 'Opcional.'}
            />
          </div>
        )}
      </div>
      <TextareaField label="Notas" name="notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}
