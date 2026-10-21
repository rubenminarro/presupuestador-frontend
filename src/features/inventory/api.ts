import type { StatusMap } from '@/components/ui/StatusBadge'
import type { Part } from '@/features/parts/api'
import type { Supplier } from '@/features/suppliers/api'
import { getData, getPage, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

/** `PartStockResource`: saldo por repuesto en el depósito. Cantidades hasta 3 decimales; costos sin IVA. */
export interface PartStock {
  id: number
  part_id: number
  warehouse_id: number
  quantity_on_hand: string
  quantity_reserved: string
  quantity_available: string
  average_cost: string
  stock_value: string
  is_below_minimum?: boolean
  last_movement_at: string | null
  part: Part
}

export type MovementType =
  | 'initial'
  | 'purchase'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'supplier_return'
  | 'loss'
  | 'work_order_out'
  | 'work_order_return'
  | 'purchase_cancellation'

/** `InventoryMovementResource`; el detalle (`ShowInventoryMovementResource`) suma proveedor, referencia y motivo. */
export interface InventoryMovement {
  id: number
  part_id: number
  type: { value: MovementType; label: string; direction: 'in' | 'out' }
  /** Con signo: negativa en las salidas. */
  quantity: string
  unit_cost: string
  total_cost: string
  balance_after: string
  average_cost_after: string
  document_number: string | null
  part?: Pick<Part, 'id' | 'code' | 'name'> | Part
  created_by?: { id: number; name: string } | null
  created_at: string
  // Solo en el detalle:
  supplier_id?: number | null
  supplier?: Supplier | null
  reference?: { type: string; id: number } | null
  reason?: string | null
  warehouse?: { id: number; code: string; name: string } | null
}

export const MOVEMENT_TYPE: StatusMap = {
  initial: { label: 'Stock inicial', color: 'blue' },
  purchase: { label: 'Compra', color: 'green' },
  adjustment_in: { label: 'Ajuste positivo', color: 'teal' },
  adjustment_out: { label: 'Ajuste negativo', color: 'orange' },
  supplier_return: { label: 'Devolución a proveedor', color: 'purple' },
  loss: { label: 'Baja / merma', color: 'red' },
  work_order_out: { label: 'Consumo en OT', color: 'azure' },
  work_order_return: { label: 'Devolución desde OT', color: 'cyan' },
  purchase_cancellation: { label: 'Anulación de compra', color: 'pink' },
}

/** Salidas manuales (`InventoryMovementType::manualExits()`); la devolución exige proveedor. */
export const EXIT_TYPES = ['supplier_return', 'loss'] as const

export interface InventoryEntryInput {
  part_id: number
  type: 'initial'
  quantity: number | null
  unit_cost: number | null
  supplier_id: number | null
  document_number: string | null
  reason: string | null
}

export interface InventoryExitInput {
  part_id: number
  type: string
  quantity: number | null
  supplier_id: number | null
  document_number: string | null
  reason: string
}

export interface InventoryAdjustmentInput {
  part_id: number
  counted_quantity: number | null
  unit_cost: number | null
  reason: string
}

export const inventoryApi = {
  stocks: (params: ListParams) => getPage<PartStock>('/inventory/stocks', params),
  movements: (params: ListParams) => getPage<InventoryMovement>('/inventory/movements', params),
  partMovements: (partId: number, params: ListParams) => getPage<InventoryMovement>(`/parts/${partId}/movements`, params),
  movement: (id: number) => getData<InventoryMovement>(`/inventory/movements/${id}`),
  entry: (body: InventoryEntryInput) => postData<InventoryMovement>('/inventory/entries', body),
  exit: (body: InventoryExitInput) => postData<InventoryMovement>('/inventory/exits', body),
  adjust: (body: InventoryAdjustmentInput) => postData<InventoryMovement>('/inventory/adjustments', body),
}
