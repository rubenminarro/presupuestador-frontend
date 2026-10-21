export type BadgeColor = 'blue' | 'azure' | 'indigo' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'teal' | 'cyan' | 'secondary'

/** Traducción y color de cada valor de un enum del backend (p. ej. `BudgetStatus`). */
export type StatusMap = Record<string, { label: string; color: BadgeColor }>

interface StatusBadgeProps {
  value: string | null | undefined
  map: StatusMap
}

export function StatusBadge({ value, map }: StatusBadgeProps) {
  if (!value) return <span className="text-secondary">—</span>
  const status = map[value] ?? { label: value, color: 'secondary' }
  return <span className={`badge bg-${status.color}-lt`}>{status.label}</span>
}
