import { getData, postData } from '@/services/api'
import type { LoginResult, Session } from '@/types/auth'

export const authService = {
  login: (email: string, password: string) => postData<LoginResult>('/login', { email, password }),
  me: () => getData<Session>('/me'),
  logout: () => postData<null>('/logout'),
}
