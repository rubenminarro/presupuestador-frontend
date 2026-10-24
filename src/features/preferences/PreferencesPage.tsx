import { useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { IconDeviceDesktop, IconMoon, IconRestore, IconSun, type IconProps } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageBody, PageHeader } from '@/components/ui/Page'
import {
  BASE_OPTIONS,
  FONT_OPTIONS,
  LAYOUT_OPTIONS,
  NAVBAR_BEHAVIOR_OPTIONS,
  NAVBAR_POSITION_OPTIONS,
  NAVBAR_STYLE_OPTIONS,
  NAVBAR_THEME_OPTIONS,
  PRIMARY_OPTIONS,
  RADIUS_OPTIONS,
  SIDEBAR_OPTIONS,
  THEME_OPTIONS,
  type Option,
  type Preferences,
} from '@/features/preferences/api'
import { usePreferences } from '@/features/preferences/usePreferences'

const THEME_ICONS: Record<string, ComponentType<IconProps>> = {
  light: IconSun,
  dark: IconMoon,
  auto: IconDeviceDesktop,
}

// Vista previa de cada familia en su propio rótulo (Tabler aplica la elegida a toda la app).
const FONT_PREVIEW: Record<string, CSSProperties> = {
  'sans-serif': { fontFamily: 'var(--tblr-font-sans-serif)' },
  serif: { fontFamily: 'var(--tblr-font-serif)' },
  monospace: { fontFamily: 'var(--tblr-font-monospace)' },
  comic: { fontFamily: 'var(--tblr-font-comic)' },
}

/** Preferencias visuales del usuario: cada cambio se aplica al instante y se guarda en su cuenta. */
export function PreferencesPage() {
  const { preferences, update, reset, isSaving } = usePreferences()
  const [confirmReset, setConfirmReset] = useState(false)

  function field<K extends keyof Preferences>(key: K) {
    return { name: key, value: preferences[key], onChange: (value: Preferences[K]) => update({ [key]: value }) }
  }

  const hasSidebar = preferences.navbar_position !== 'horizontal'
  const hasTopNavbar = preferences.navbar_position !== 'vertical'

  return (
    <>
      <PageHeader
        pretitle="Mi cuenta"
        title="Preferencias"
        actions={
          <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmReset(true)}>
            <IconRestore size={16} className="me-2" aria-hidden="true" />
            Restaurar valores predeterminados
          </button>
        }
      />
      <PageBody>
        <p className="text-secondary">
          Los cambios se aplican al instante y se guardan en tu cuenta: los vas a ver igual en cualquier dispositivo.
          {isSaving && <span className="ms-2 spinner-border spinner-border-sm" role="status" aria-label="Guardando" />}
        </p>
        <div className="row row-cards">
          <div className="col-lg-6">
            <Section title="Apariencia">
              <Choice label="Modo de color" hint="Automático sigue la configuración del sistema operativo.">
                <OptionGroup {...field('theme')} options={THEME_OPTIONS} icons={THEME_ICONS} />
              </Choice>
            </Section>

            <Section title="Colores">
              <Choice label="Color de acento" hint="Botones, enlaces y elementos activos.">
                <ColorGroup {...field('theme_primary')} options={PRIMARY_OPTIONS} />
              </Choice>
              <Choice label="Paleta de grises" hint="Tono de fondos, bordes y textos secundarios.">
                <OptionGroup {...field('theme_base')} options={BASE_OPTIONS} />
              </Choice>
              <Choice label="Color de la navegación">
                <OptionGroup {...field('navbar_theme')} options={NAVBAR_THEME_OPTIONS} />
              </Choice>
            </Section>

            <Section title="Tipografía">
              <Choice label="Familia tipográfica">
                <OptionGroup {...field('theme_font')} options={FONT_OPTIONS} styles={FONT_PREVIEW} />
              </Choice>
              <Choice label="Redondeo de bordes" hint="Tarjetas, botones y campos.">
                <OptionGroup {...field('theme_radius')} options={RADIUS_OPTIONS} />
              </Choice>
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title="Distribución">
              <Choice
                label="Ancho del contenido"
                hint="Fluido usa todo el ancho de la pantalla; enmarcado centra la aplicación sobre un fondo."
              >
                <OptionGroup {...field('layout')} options={LAYOUT_OPTIONS} />
              </Choice>
            </Section>

            <Section title="Navegación">
              <Choice
                label="Posición del menú"
                hint="Combinada: el menú en la barra lateral y una barra superior con las notificaciones y tu usuario."
              >
                <OptionGroup {...field('navbar_position')} options={NAVBAR_POSITION_OPTIONS} />
              </Choice>
              <Choice label="Estilo" hint="Flotante separa la navegación de los bordes de la pantalla.">
                <OptionGroup {...field('navbar_style')} options={NAVBAR_STYLE_OPTIONS} />
              </Choice>
              <Choice
                label="Barra superior"
                hint={
                  hasTopNavbar
                    ? 'Fija: la barra queda visible al desplazarte por la página.'
                    : 'Con el menú lateral, es la barra de las notificaciones y tu usuario.'
                }
              >
                <OptionGroup {...field('navbar')} options={NAVBAR_BEHAVIOR_OPTIONS} />
              </Choice>
              <Choice
                label="Barra lateral"
                hint={
                  hasSidebar
                    ? 'En pantallas grandes. También se pliega con el botón junto al nombre del sistema.'
                    : 'Solo aplica con el menú en la barra lateral o combinado.'
                }
              >
                <OptionGroup {...field('sidebar')} options={SIDEBAR_OPTIONS} disabled={!hasSidebar} />
              </Choice>
            </Section>
          </div>
        </div>
      </PageBody>
      <ConfirmDialog
        open={confirmReset}
        title="Restaurar valores predeterminados"
        message="Se van a perder tus preferencias de apariencia, colores, tipografía, distribución y navegación."
        confirmLabel="Restaurar"
        variant="warning"
        onConfirm={() => {
          reset()
          setConfirmReset(false)
        }}
        onClose={() => setConfirmReset(false)}
      />
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card mb-3">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

function Choice({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="mb-3">
      <legend className="form-label">{label}</legend>
      {children}
      {hint && <small className="form-hint">{hint}</small>}
    </fieldset>
  )
}

interface GroupProps<T extends string> {
  name: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}

/** Opciones como botones de Tabler (`form-selectgroup`), con radios accesibles por teclado. */
function OptionGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
  icons,
  styles,
}: GroupProps<T> & { icons?: Record<string, ComponentType<IconProps>>; styles?: Record<string, CSSProperties> }) {
  return (
    <div className="form-selectgroup">
      {options.map((option) => {
        const Icon = icons?.[option.value]
        return (
          <label key={option.value} className="form-selectgroup-item">
            <input
              type="radio"
              name={name}
              value={option.value}
              className="form-selectgroup-input"
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            <span className="form-selectgroup-label" style={styles?.[option.value]}>
              {Icon && <Icon size={16} className="me-1" aria-hidden="true" />}
              {option.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}

/** Muestras de color de Tabler (`form-colorinput`); el nombre va en la etiqueta accesible y el `title`. */
function ColorGroup<T extends string>({ name, value, options, onChange }: GroupProps<T>) {
  return (
    <div className="row g-2">
      {options.map((option) => (
        <div key={option.value} className="col-auto">
          <label className="form-colorinput" title={option.label}>
            <input
              type="radio"
              name={name}
              value={option.value}
              className="form-colorinput-input"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-label={option.label}
            />
            <span className={`form-colorinput-color ${option.value === 'inverted' ? 'bg-dark' : `bg-${option.value}`}`} />
          </label>
        </div>
      ))}
    </div>
  )
}
