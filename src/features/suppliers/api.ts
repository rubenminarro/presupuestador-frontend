import { useQuery } from '@tanstack/react-query'
import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

/** Datos del vínculo repuesto–proveedor (`part_supplier`), presentes al listar los proveedores de un repuesto. */
export interface PartSupplierPivot {
  supplier_part_code: string | null
  /** Último costo sin IVA (lo actualizan las compras), decimal como string. */
  last_cost: string | null
  is_preferred: boolean
}

/** `SupplierResource`; el detalle (`ShowSupplierResource`) suma `address`, `notes` y `parts`. */
export interface Supplier {
  id: number
  name: string
  tax_id: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  address?: string | null
  notes?: string | null
  is_active: boolean
  parts_count?: number
  pivot?: PartSupplierPivot
  created_at: string
  updated_at: string
}

export interface SupplierInput {
  name: string
  tax_id: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
}

export const suppliersApi = {
  list: (params: ListParams) => getPage<Supplier>('/suppliers', params),
  show: (id: number) => getData<Supplier>(`/suppliers/${id}`),
  create: (body: SupplierInput) => postData<Supplier>('/suppliers', body),
  update: (id: number, body: SupplierInput) => patchData<Supplier>(`/suppliers/${id}`, body),
  remove: (id: number) => deleteData(`/suppliers/${id}`),
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'es')

/** Proveedores para selects (sin endpoint "todos": una página grande). `active` filtra los activos. */
export function useAllSuppliers({ active, enabled = true }: { active?: boolean; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['suppliers', 'all', active ?? null],
    queryFn: async () => (await suppliersApi.list({ per_page: 1000, is_active: active === undefined ? undefined : Number(active) })).items.sort(byName),
    staleTime: 5 * 60_000,
    enabled,
  })
}
