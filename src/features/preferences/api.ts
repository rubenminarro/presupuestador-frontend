import { deleteData, getData, patchData } from '@/services/api'

/**
 * Preferencias visuales del usuario (`GET|PATCH|DELETE /me/preferences`, también en `GET /me`). Cada clave es un
 * ajuste de tema de Tabler 1.7: se aplica como `data-bs-<clave con guiones>` en `<html>` (ver `theme.ts`).
 */
export interface Preferences {
  theme: ThemeMode
  theme_primary: PrimaryColor
  theme_base: BaseColor
  theme_font: FontFamily
  theme_radius: Radius
  layout: Layout
  navbar_position: NavbarPosition
  navbar_style: NavbarStyle
  navbar_theme: NavbarTheme
  navbar: NavbarBehavior
  sidebar: SidebarState
}

export type ThemeMode = 'auto' | 'light' | 'dark'
export type PrimaryColor =
  | 'blue'
  | 'azure'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'inverted'
export type BaseColor = 'neutral' | 'slate' | 'gray' | 'zinc' | 'stone' | 'mist'
export type FontFamily = 'sans-serif' | 'serif' | 'monospace' | 'comic'
export type Radius = '0' | '0.5' | '1' | '1.5' | '2'
export type Layout = 'default' | 'fluid' | 'boxed'
export type NavbarPosition = 'vertical' | 'horizontal' | 'combined'
export type NavbarStyle = 'default' | 'floating'
export type NavbarTheme = 'dark' | 'default' | 'primary'
export type NavbarBehavior = 'default' | 'sticky'
export type SidebarState = 'default' | 'folded' | 'folded-hover'

/** Igual que `App\Support\UserPreferences::DEFAULTS`: el aspecto original (barra lateral oscura y expandida). */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'auto',
  theme_primary: 'blue',
  theme_base: 'neutral',
  theme_font: 'sans-serif',
  theme_radius: '1',
  layout: 'default',
  navbar_position: 'vertical',
  navbar_style: 'default',
  navbar_theme: 'dark',
  navbar: 'default',
  sidebar: 'default',
}

export interface Option<T extends string> {
  value: T
  label: string
}

export const THEME_OPTIONS: Option<ThemeMode>[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'auto', label: 'Automático' },
]

export const PRIMARY_OPTIONS: Option<PrimaryColor>[] = [
  { value: 'blue', label: 'Azul' },
  { value: 'azure', label: 'Celeste' },
  { value: 'indigo', label: 'Índigo' },
  { value: 'purple', label: 'Violeta' },
  { value: 'pink', label: 'Rosa' },
  { value: 'red', label: 'Rojo' },
  { value: 'orange', label: 'Naranja' },
  { value: 'yellow', label: 'Amarillo' },
  { value: 'lime', label: 'Lima' },
  { value: 'green', label: 'Verde' },
  { value: 'teal', label: 'Verde azulado' },
  { value: 'cyan', label: 'Cian' },
  { value: 'inverted', label: 'Invertido (negro / blanco)' },
]

export const BASE_OPTIONS: Option<BaseColor>[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'slate', label: 'Pizarra' },
  { value: 'gray', label: 'Gris' },
  { value: 'zinc', label: 'Zinc' },
  { value: 'stone', label: 'Piedra' },
  { value: 'mist', label: 'Niebla' },
]

export const FONT_OPTIONS: Option<FontFamily>[] = [
  { value: 'sans-serif', label: 'Sans serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monoespaciada' },
  { value: 'comic', label: 'Cómica' },
]

export const RADIUS_OPTIONS: Option<Radius>[] = [
  { value: '0', label: 'Sin redondeo' },
  { value: '0.5', label: 'Mínimo' },
  { value: '1', label: 'Normal' },
  { value: '1.5', label: 'Amplio' },
  { value: '2', label: 'Máximo' },
]

export const LAYOUT_OPTIONS: Option<Layout>[] = [
  { value: 'default', label: 'Estándar' },
  { value: 'fluid', label: 'Fluido (ancho completo)' },
  { value: 'boxed', label: 'Enmarcado' },
]

export const NAVBAR_POSITION_OPTIONS: Option<NavbarPosition>[] = [
  { value: 'vertical', label: 'Barra lateral' },
  { value: 'horizontal', label: 'Barra superior' },
  { value: 'combined', label: 'Combinada' },
]

export const NAVBAR_STYLE_OPTIONS: Option<NavbarStyle>[] = [
  { value: 'default', label: 'Adosada' },
  { value: 'floating', label: 'Flotante' },
]

export const NAVBAR_THEME_OPTIONS: Option<NavbarTheme>[] = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'default', label: 'Como la página' },
  { value: 'primary', label: 'Color de acento' },
]

export const NAVBAR_BEHAVIOR_OPTIONS: Option<NavbarBehavior>[] = [
  { value: 'default', label: 'Se desplaza con la página' },
  { value: 'sticky', label: 'Fija arriba' },
]

export const SIDEBAR_OPTIONS: Option<SidebarState>[] = [
  { value: 'default', label: 'Expandida' },
  { value: 'folded', label: 'Plegada' },
  { value: 'folded-hover', label: 'Plegada, se expande al pasar el mouse' },
]

export const preferencesApi = {
  get: () => getData<Preferences>('/me/preferences'),
  update: (changes: Partial<Preferences>) => patchData<Preferences>('/me/preferences', changes),
  reset: () => deleteData<Preferences>('/me/preferences'),
}
