const ROLE_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  mechanic: 'Mecánico',
  recepcionista: 'Recepcionista',
  'jefe-taller': 'Jefe de taller',
  cajero: 'Cajero',
  deposito: 'Depósito',
}

export function roleLabel(name: string): string {
  return ROLE_LABELS[name] ?? name
}
