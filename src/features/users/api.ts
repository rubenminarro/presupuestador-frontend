import { deleteData, getData, getPage, patchData, postData } from '@/services/api'
import type { ListParams } from '@/types/api'

/** `UsersResource` (listado): los roles llegan solo por nombre. */
export interface UserListItem {
  id: number
  name: string
  first_name: string
  last_name: string
  email: string
  roles: string[]
}

/** `ShowUserResource` (detalle, alta y edición). */
export interface UserDetail extends Omit<UserListItem, 'roles'> {
  roles: { id: number; name: string; description: string | null }[]
}

/** Un solo rol por usuario, por nombre. Sin `password` la contraseña no cambia. */
export interface UserInput {
  name?: string
  email?: string
  first_name?: string
  last_name?: string
  role?: string
  password?: string
  password_confirmation?: string
}

export const usersApi = {
  list: (params: ListParams) => getPage<UserListItem>('/users', params),
  show: (id: number) => getData<UserDetail>(`/users/${id}`),
  create: (body: UserInput) => postData<UserDetail>('/users', body),
  update: (id: number, body: UserInput) => patchData<UserDetail>(`/users/${id}`, body),
  remove: (id: number) => deleteData(`/users/${id}`),
}
