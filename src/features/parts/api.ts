import { useQuery } from '@tanstack/react-query'
import type { StatusMap } from '@/components/ui/StatusBadge'
import type { PartSupplierPivot, Supplier } from '@/features/suppliers/api'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export interface PartCategory {
  id: number
  name: string
  description: string | null
  is_active: boolean
  parts_count?: number
  created_at: string
  updated_at: string
}

export interface PartCategoryInput {
  name: string
  description: string | null
  is_active: boolean
}

export type PartStatus = 'active' | 'inactive' | 'discontinued'
export type PartUnit = 'unit' | 'liter' | 'kilogram' | 'meter' | 'set' | 'kit'

/** Saldo del repuesto en el depósito (`ShowPartResource.stock`); cantidades hasta 3 decimales, costo sin IVA. */
export interface PartStockSummary {
  on_hand: string
  reserved: string
  available: string
  average_cost: string
  is_below_minimum: boolean
  last_movement_at: string | null
}

/** `PartResource`; el detalle (`ShowPartResource`) suma `description`, `suppliers` y `stock`. */
export interface Part {
  id: number
  code: string
  sku: string | null
  part_number: string | null
  name: string
  description?: string | null
  brand: string | null
  part_category_id: number
  unit: { value: PartUnit; label: string }
  /** Precios sin IVA, decimales como string. `cost_price` es solo referencia: el costo real es el promedio del stock. */
  cost_price: string
  sale_price: string
  minimum_stock: string | null
  status: { value: PartStatus; label: string }
  category?: PartCategory | null
  suppliers?: Supplier[]
  stock?: PartStockSummary | null
  pivot?: PartSupplierPivot
  created_at: string
  updated_at: string
}

export interface PartInput {
  part_category_id: number | null
  name: string
  sku: string | null
  part_number: string | null
  brand: string | null
  description: string | null
  unit: string
  cost_price: number | null
  sale_price: number | null
  /** Sin null: se omite si está vacío. */
  minimum_stock?: number
}

export interface PartSupplierInput {
  supplier_id?: number | null
  supplier_part_code?: string | null
  last_cost?: number | null
  is_preferred: boolean
}

export const PART_STATUS: StatusMap = {
  active: { label: 'Activo', color: 'green' },
  inactive: { label: 'Inactivo', color: 'secondary' },
  discontinued: { label: 'Descontinuado', color: 'red' },
}

export const PART_UNITS: Record<PartUnit, string> = {
  unit: 'Unidad',
  liter: 'Litro',
  kilogram: 'Kilogramo',
  meter: 'Metro',
  set: 'Juego',
  kit: 'Kit',
}

/** Unidades que admiten fracciones (`PartUnit::allowsFractions()`); el resto, solo enteros. */
export function allowsFractions(unit: string | undefined): boolean {
  return unit === 'liter' || unit === 'kilogram' || unit === 'meter'
}

export const partCategoriesApi = {
  list: (params: ListParams) => getPage<PartCategory>('/part-categories', params),
  create: (body: PartCategoryInput) => postData<PartCategory>('/part-categories', body),
  update: (id: number, body: PartCategoryInput) => patchData<PartCategory>(`/part-categories/${id}`, body),
  remove: (id: number) => deleteData(`/part-categories/${id}`),
}

export const partsApi = {
  list: (params: ListParams) => getPage<Part>('/parts', params),
  show: (id: number) => getData<Part>(`/parts/${id}`),
  create: (body: PartInput) => postData<Part>('/parts', body),
  update: (id: number, body: PartInput) => patchData<Part>(`/parts/${id}`, body),
  remove: (id: number) => deleteData(`/parts/${id}`),
  activate: (id: number) => postData<Part>(`/parts/${id}/activate`),
  deactivate: (id: number) => postData<Part>(`/parts/${id}/deactivate`),
  discontinue: (id: number) => postData<Part>(`/parts/${id}/discontinue`),
  attachSupplier: (id: number, body: PartSupplierInput) => postData<Part>(`/parts/${id}/suppliers`, body),
  updateSupplier: (id: number, supplierId: number, body: PartSupplierInput) =>
    patchData<Part>(`/parts/${id}/suppliers/${supplierId}`, body),
  detachSupplier: (id: number, supplierId: number) => deleteData<Part>(`/parts/${id}/suppliers/${supplierId}`),
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'es')

/** Categorías para selects y filtros (una página grande). `active` filtra las activas. */
export function useAllPartCategories({ active, enabled = true }: { active?: boolean; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['part-categories', 'all', active ?? null],
    queryFn: async () =>
      (await partCategoriesApi.list({ per_page: 1000, is_active: active === undefined ? undefined : Number(active) })).items.sort(byName),
    staleTime: 5 * 60_000,
    enabled,
  })
}
