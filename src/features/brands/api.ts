import { useQuery } from '@tanstack/react-query'
import { deleteData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export interface Brand {
  id: number
  name: string
  created_at: string
  updated_at: string
}

/** `VehicleModelResource`: la marca viene como modelo completo. */
export interface VehicleModel {
  id: number
  name: string
  brand: Brand | null
}

export interface BrandInput {
  name: string
}

export interface VehicleModelInput {
  name: string
  brand_id: number
}

// Sin endpoint "todos": para los selects se pide una página grande.
const ALL = { per_page: 1000 }

export const brandsApi = {
  list: (params: ListParams) => getPage<Brand>('/brands', params),
  create: (body: BrandInput) => postData<Brand>('/brands', body),
  update: (id: number, body: BrandInput) => patchData<Brand>(`/brands/${id}`, body),
  remove: (id: number) => deleteData(`/brands/${id}`),
}

export const vehicleModelsApi = {
  list: (params: ListParams) => getPage<VehicleModel>('/vehicle-models', params),
  create: (body: VehicleModelInput) => postData<VehicleModel>('/vehicle-models', body),
  update: (id: number, body: VehicleModelInput) => patchData<VehicleModel>(`/vehicle-models/${id}`, body),
  remove: (id: number) => deleteData(`/vehicle-models/${id}`),
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'es')

export function useAllBrands(enabled = true) {
  return useQuery({
    queryKey: ['brands', 'all'],
    queryFn: async () => (await brandsApi.list(ALL)).items.sort(byName),
    staleTime: 5 * 60_000,
    enabled,
  })
}

/** Modelos de una marca (`GET vehicle-models?brand_id=`); sin marca no consulta. */
export function useVehicleModelsByBrand(brandId: number | null) {
  return useQuery({
    queryKey: ['vehicle-models', 'by-brand', brandId],
    queryFn: async () => (await vehicleModelsApi.list({ ...ALL, brand_id: brandId })).items.sort(byName),
    staleTime: 5 * 60_000,
    enabled: brandId !== null,
  })
}
