import { deleteData, getData, patchWithMeta, postData } from '@/services/api'

/**
 * `GET /branding` (público): el logo del sistema tal como se subió (para fondos oscuros) y su versión negra (para
 * fondos claros), o `null` si no hay logo. Sin versión negra (JPG o PNG sin transparencia) las dos URL son iguales.
 */
export interface Branding {
  logo_url: string | null
  logo_black_url: string | null
  /** Ícono de la pestaña, independiente del logo; `null` usa el ícono original de la app. */
  favicon_url: string | null
}

export const BRANDING_KEY = ['branding'] as const
export const WORKSHOP_SETTINGS_KEY = ['system-settings', 'workshop'] as const

/** `GET /system-settings/workshop`: valores vigentes (lo guardado o, si no, el `.env`). */
export interface WorkshopSettings {
  company_name: string | null
  company_legal_name: string | null
  company_tax_id: string | null
  company_activity: string | null
  company_address: string | null
  company_city: string | null
  company_phone: string | null
  company_email: string | null
  default_tax_rate: number
  mail_from_name: string | null
  mail_from_address: string | null
  reminders_at: string
  invoice_due_soon_days: number
  invoice_overdue_repeat_days: number
}

export type WorkshopSettingsValues = Record<keyof WorkshopSettings, string>

const NUMERIC_SETTINGS: (keyof WorkshopSettings)[] = ['default_tax_rate', 'invoice_due_soon_days', 'invoice_overdue_repeat_days']

export function workshopSettingsValues(settings: WorkshopSettings): WorkshopSettingsValues {
  const entries = Object.entries(settings).map(([key, value]) => [key, value === null ? '' : String(value)])

  return Object.fromEntries(entries) as WorkshopSettingsValues
}

/**
 * Solo lo que cambió: guardar el resto fijaría en la base los valores del `.env`. Un campo vaciado va en `null`,
 * que vuelve al valor por defecto. Los números van como número (0 es una tasa válida, no un vacío).
 */
export function changedWorkshopSettings(initial: WorkshopSettingsValues, values: WorkshopSettingsValues) {
  const changed = (Object.keys(values) as (keyof WorkshopSettings)[]).filter((key) => values[key] !== initial[key])

  return Object.fromEntries(
    changed.map((key) => {
      const value = values[key].trim()
      if (value === '') return [key, null]

      return [key, NUMERIC_SETTINGS.includes(key) ? Number(value) : value]
    }),
  ) as Partial<Record<keyof WorkshopSettings, string | number | null>>
}

/** Formatos que dibuja bien el generador de PDF del backend (dompdf). */
export const LOGO_ACCEPT = 'image/png,image/jpeg'
export const LOGO_MAX_BYTES = 2 * 1024 * 1024

/** Favicon: PNG o ICO cuadrado (16 a 1024 px) o SVG, hasta 512 KB (el backend valida dimensiones y contenido). */
export const FAVICON_ACCEPT = '.png,.ico,.svg,image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml'
export const FAVICON_EXTENSIONS = ['png', 'ico', 'svg']
export const FAVICON_MAX_BYTES = 512 * 1024

export const systemSettingsApi = {
  branding: () => getData<Branding>('/branding'),
  workshop: () => getData<WorkshopSettings>('/system-settings/workshop'),
  /** `meta.warnings`: el efecto de cambiar la tasa de IVA. */
  updateWorkshop: (body: ReturnType<typeof changedWorkshopSettings>) =>
    patchWithMeta<WorkshopSettings, { warnings?: string[] }>('/system-settings/workshop', body),
  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('logo', file)
    return postData<Branding>('/system-settings/logo', form)
  },
  deleteLogo: () => deleteData<Branding>('/system-settings/logo'),
  uploadFavicon: (file: File) => {
    const form = new FormData()
    form.append('favicon', file)
    return postData<Branding>('/system-settings/favicon', form)
  },
  deleteFavicon: () => deleteData<Branding>('/system-settings/favicon'),
}
