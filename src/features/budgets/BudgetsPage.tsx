import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { useAuth } from '@/features/auth/useAuth'
import { BUDGET_STATUS, budgetsApi } from '@/features/budgets/api'
import { budgetColumns } from '@/features/budgets/budgetColumns'
import { useListParams } from '@/lib/useListParams'

/** Los presupuestos se crean desde la ficha de la recepción. */
export function BudgetsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const params = { ...list.params, status, date_from: dateFrom, date_to: dateTo }
  const query = useQuery({
    queryKey: ['budgets', params],
    queryFn: () => budgetsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    list.setPage(1)
  }

  return (
    <>
      <PageHeader pretitle="Taller" title="Presupuestos" />
      <PageBody>
        <DataTable
          columns={budgetColumns({ showReception: true, linkReception: can('receptions.show') })}
          rows={query.data?.items}
          rowKey={(budget) => budget.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          onRowClick={can('budgets.show') ? (budget) => navigate(`/budgets/${budget.id}`) : undefined}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Código, cliente, documento o chapa…' }}
          toolbar={
            <>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter(setStatus)(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(BUDGET_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Desde"
                title="Desde"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => filter(setDateFrom)(event.target.value)}
              />
              <input
                type="date"
                className="form-control form-control-sm w-auto"
                aria-label="Hasta"
                title="Hasta"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => filter(setDateTo)(event.target.value)}
              />
            </>
          }
        />
      </PageBody>
    </>
  )
}
