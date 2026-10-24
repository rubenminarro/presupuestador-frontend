import { deleteData, getData, postData } from '@/services/api'

/**
 * `GET /branding` (público): el logo del sistema tal como se subió (para fondos oscuros) y su versión negra (para
 * fondos claros), o `null` si no hay logo. Sin versión negra (JPG o PNG sin transparencia) las dos URL son iguales.
 */
export interface Branding {
  logo_url: string | null
  logo_black_url: string | null
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
