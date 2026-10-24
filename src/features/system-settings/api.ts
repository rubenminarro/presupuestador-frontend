import { deleteData, getData, postData } from '@/services/api'

/** `GET /branding` (público): el logo del sistema, o `null` si no se cargó ninguno. */
export interface Branding {
  logo_url: string | null
}

export const BRANDING_KEY = ['branding'] as const

/** Formatos que dibuja bien el generador de PDF del backend (dompdf). */
export const LOGO_ACCEPT = 'image/png,image/jpeg'
export const LOGO_MAX_BYTES = 2 * 1024 * 1024

export const systemSettingsApi = {
  branding: () => getData<Branding>('/branding'),
  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('logo', file)
    return postData<Branding>('/system-settings/logo', form)
  },
  deleteLogo: () => deleteData<Branding>('/system-settings/logo'),
}
