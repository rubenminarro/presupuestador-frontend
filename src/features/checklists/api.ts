import { deleteData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

export type CheckListType = 'boolean' | 'text' | 'number'

export interface CheckListItem {
  id: number
  name: string
  type: CheckListType
  /** El backend lo devuelve como 1/0 (columna sin cast). */
  required: boolean | number
  /** Inactivo: no entra en los checklists de las recepciones nuevas. Un ítem ya usado se desactiva, no se elimina. */
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CheckListInput {
  name: string
  type: CheckListType
  required: boolean
  is_active: boolean
}

/** `CheckListType`: en la recepción, `text` se carga como bien / mal / no aplica. */
export const CHECKLIST_TYPE_LABELS: Record<CheckListType, string> = {
  boolean: 'Sí / No',
  text: 'Estado (bien / mal / no aplica)',
  number: 'Número',
}

export const checklistsApi = {
  list: (params: ListParams) => getPage<CheckListItem>('/checklists', params),
  create: (body: CheckListInput) => postData<CheckListItem>('/checklists', body),
  update: (id: number, body: CheckListInput) => patchData<CheckListItem>(`/checklists/${id}`, body),
  remove: (id: number) => deleteData(`/checklists/${id}`),
}
