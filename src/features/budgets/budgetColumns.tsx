import { Link } from 'react-router-dom'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BUDGET_STATUS, type Budget } from '@/features/budgets/api'
import { receptionVehicleLabel } from '@/features/receptions/api'
import { formatDate, formatMoney } from '@/lib/format'

interface BudgetColumnsOptions {
  /** Columna de cliente y vehículo (no hace falta dentro de la ficha de la recepción). */
  showReception: boolean
  /** Enlace a la recepción (`receptions.show`). */
  linkReception?: boolean
}

export function budgetColumns({ showReception, linkReception }: BudgetColumnsOptions): Column<Budget>[] {
  return [
    { key: 'code', header: 'Código', className: 'text-nowrap', render: (budget) => <span className="text-secondary">{budget.code}</span> },
    { key: 'date', header: 'Fecha', className: 'text-nowrap', render: (budget) => formatDate(budget.created_at) },
    ...(showReception
      ? [
          {
            key: 'reception',
            header: 'Cliente / vehículo',
            render: (budget: Budget) =>
              budget.reception ? (
                <>
                  <div>{budget.reception.client.full_name}</div>
                  <div className="small text-secondary">
                    {linkReception ? (
                      <Link to={`/receptions/${budget.reception_id}`} onClick={(event) => event.stopPropagation()}>
                        #{budget.reception_id}
                      </Link>
                    ) : (
                      `#${budget.reception_id}`
                    )}{' '}
                    · {receptionVehicleLabel(budget.reception.vehicle)}
                  </div>
                </>
              ) : (
                `#${budget.reception_id}`
              ),
          },
        ]
      : []),
    { key: 'total', header: 'Total (con IVA)', className: 'text-end text-nowrap', render: (budget) => formatMoney(budget.total) },
    { key: 'status', header: 'Estado', render: (budget) => <StatusBadge value={budget.status} map={BUDGET_STATUS} /> },
  ]
}
