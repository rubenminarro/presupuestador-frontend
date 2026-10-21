import type { ComponentType } from 'react'
import type { IconProps } from '@tabler/icons-react'
import { cx } from '@/lib/cx'

interface IconButtonProps {
  label: string
  icon: ComponentType<IconProps>
  onClick: () => void
  variant?: 'secondary' | 'danger' | 'primary' | 'success' | 'warning'
  disabled?: boolean
}

/** Acción de fila de tabla: solo ícono, con `aria-label` y tooltip nativo. */
export function IconButton({ label, icon: Icon, onClick, variant = 'secondary', disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cx('btn btn-sm btn-icon', `btn-ghost-${variant}`)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        // Las filas pueden ser clicables (abren el detalle): la acción no debe disparar también eso.
        event.stopPropagation()
        onClick()
      }}
    >
      <Icon size={18} stroke={1.75} aria-hidden="true" />
    </button>
  )
}
