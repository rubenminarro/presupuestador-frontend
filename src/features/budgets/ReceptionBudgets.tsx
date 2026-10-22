import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconPlus } from '@tabler/icons-react'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { TextareaField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { budgetsApi, type Budget } from '@/features/budgets/api'
import { budgetColumns } from '@/features/budgets/budgetColumns'
import { isReceptionOpen, type Reception } from '@/features/receptions/api'
import { nullIfEmpty } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/** Presupuestos de la recepción (en su ficha), con el alta. */
export function ReceptionBudgets({ reception }: { reception: Reception }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const params = { reception_id: reception.id, per_page: 50 }

  const query = useQuery({
    queryKey: ['budgets', params],
    queryFn: () => budgetsApi.list(params),
  })

  return (
    <>
      <DataTable
        title="Presupuestos"
        columns={budgetColumns({ showReception: false })}
        rows={query.data?.items}
        rowKey={(budget) => budget.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="La recepción no tiene presupuestos."
        onRowClick={can('budgets.show') ? (budget) => navigate(`/budgets/${budget.id}`) : undefined}
        toolbar={
          can('budgets.store') &&
          isReceptionOpen(reception.status.value) && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Nuevo presupuesto
            </button>
          )
        }
      />
      {creating && (
        <NewBudgetModal
          reception={reception}
          onClose={() => setCreating(false)}
          onCreated={(budget) => (can('budgets.show') ? navigate(`/budgets/${budget.id}`) : undefined)}
        />
      )}
    </>
  )
}

function NewBudgetModal({ reception, onClose, onCreated }: { reception: Reception; onClose: () => void; onCreated: (budget: Budget) => void }) {
  const [notes, setNotes] = useState('')
  const mutation = useApiMutation(() => budgetsApi.create(reception.id, nullIfEmpty(notes)), {
    // La recepción pasa a "En proceso" al tener presupuesto.
    invalidate: [['budgets'], ['receptions']],
    successMessage: 'Presupuesto creado como borrador.',
    onSuccess: (budget) => {
      onClose()
      onCreated(budget)
    },
  })
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Nuevo presupuesto · recepción #${reception.id}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Crear">
      <p className="text-secondary">Se crea como borrador; los ítems se agregan en el presupuesto.</p>
      <TextareaField label="Notas" name="notes" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
      {errors.reception_id?.map((message) => (
        <div key={message} className="alert alert-danger py-2">
          {message}
        </div>
      ))}
    </FormModal>
  )
}
