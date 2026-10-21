import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { allowsFractions, PART_UNITS, partsApi, useAllPartCategories, type Part, type PartInput } from '@/features/parts/api'
import { compact, nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

interface PartFormModalProps {
  /** null: alta. Con id se pide el detalle (el listado no trae la descripción). */
  partId: number | null
  onClose: () => void
  onCreated?: (part: Part) => void
}

export function PartFormModal({ partId, onClose, onCreated }: PartFormModalProps) {
  const detail = useQuery({
    queryKey: ['parts', 'detail', partId],
    queryFn: () => partsApi.show(partId as number),
    enabled: partId !== null,
  })

  if (partId !== null && !detail.data) {
    return (
      <FormModal title="Editar repuesto" onClose={onClose} onSubmit={() => undefined} isSubmitting>
        {detail.error ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : <LoadingState />}
      </FormModal>
    )
  }

  return <PartForm part={detail.data ?? null} onClose={onClose} onCreated={onCreated} />
}

function PartForm({ part, onClose, onCreated }: { part: Part | null; onClose: () => void; onCreated?: (part: Part) => void }) {
  // Solo categorías activas (el backend rechaza las inactivas); al editar se conserva la actual aunque esté inactiva.
  const categories = useAllPartCategories({ active: true })
  const [categoryId, setCategoryId] = useState(toInput(part?.part_category_id))
  const [name, setName] = useState(part?.name ?? '')
  const [sku, setSku] = useState(part?.sku ?? '')
  const [partNumber, setPartNumber] = useState(part?.part_number ?? '')
  const [brand, setBrand] = useState(part?.brand ?? '')
  const [description, setDescription] = useState(part?.description ?? '')
  const [unit, setUnit] = useState<string>(part?.unit.value ?? 'unit')
  const [costPrice, setCostPrice] = useState(toInput(part?.cost_price))
  const [salePrice, setSalePrice] = useState(toInput(part?.sale_price))
  const [minimumStock, setMinimumStock] = useState(toInput(part?.minimum_stock))

  const categoryOptions = [...(categories.data ?? [])]
  if (part?.category && !categoryOptions.some((category) => category.id === part.category?.id)) {
    categoryOptions.unshift(part.category)
  }

  const mutation = useApiMutation(
    () => {
      // Opcionales vacíos → null (al editar se vacían). El stock mínimo no admite null (columna NOT NULL): vacío se
      // omite (alta: 0; edición: sin cambios).
      const body: PartInput = {
        part_category_id: toNumber(categoryId),
        name: name.trim(),
        sku: nullIfEmpty(sku),
        part_number: nullIfEmpty(partNumber),
        brand: nullIfEmpty(brand),
        description: nullIfEmpty(description),
        unit,
        cost_price: toNumber(costPrice),
        sale_price: toNumber(salePrice),
        ...compact({ minimum_stock: toNumber(minimumStock) }),
      }
      return part ? partsApi.update(part.id, body) : partsApi.create(body)
    },
    {
      invalidate: [['parts'], ['inventory'], ['part-categories']],
      successMessage: part ? 'Repuesto actualizado.' : 'Repuesto creado.',
      onSuccess: (saved) => {
        onClose()
        if (!part) onCreated?.(saved)
      },
    },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal
      title={part ? `Editar repuesto ${part.code}` : 'Nuevo repuesto'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="lg"
    >
      <div className="row">
        <div className="col-md-8">
          <TextField
            label="Nombre"
            name="name"
            required
            autoFocus
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <SelectField
            label="Categoría"
            name="part_category_id"
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            errors={errors}
          >
            <option value="">Seleccione…</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.is_active && ' (inactiva)'}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-4">
          <TextField label="SKU" name="sku" maxLength={100} value={sku} onChange={(event) => setSku(event.target.value)} errors={errors} hint="Único. Letras, números y - _ . /" />
        </div>
        <div className="col-md-4">
          <TextField
            label="Número de parte"
            name="part_number"
            maxLength={100}
            value={partNumber}
            onChange={(event) => setPartNumber(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-4">
          <TextField label="Marca" name="brand" maxLength={100} value={brand} onChange={(event) => setBrand(event.target.value)} errors={errors} />
        </div>
        <div className="col-md-3">
          <SelectField label="Unidad" name="unit" required value={unit} onChange={(event) => setUnit(event.target.value)} errors={errors}>
            {Object.entries(PART_UNITS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-3">
          <TextField
            label="Costo de referencia"
            name="cost_price"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={costPrice}
            onChange={(event) => setCostPrice(event.target.value)}
            errors={errors}
            hint="Sin IVA."
          />
        </div>
        <div className="col-md-3">
          <TextField
            label="Precio de venta"
            name="sale_price"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            errors={errors}
            hint="Sin IVA."
          />
        </div>
        <div className="col-md-3">
          <TextField
            label="Stock mínimo"
            name="minimum_stock"
            type="number"
            inputMode="decimal"
            min={0}
            step={allowsFractions(unit) ? '0.001' : '1'}
            value={minimumStock}
            onChange={(event) => setMinimumStock(event.target.value)}
            errors={errors}
            hint="Opcional (0 si se deja vacío); activa el aviso de bajo mínimo."
          />
        </div>
      </div>
      <TextareaField
        label="Descripción"
        name="description"
        rows={3}
        maxLength={1000}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        errors={errors}
      />
    </FormModal>
  )
}
