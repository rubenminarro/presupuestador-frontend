import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconTool } from '@tabler/icons-react'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import type { Budget } from '@/features/budgets/api'
import { useActiveMechanics } from '@/features/mechanics/api'
import { WORK_ORDER_STATUS, workOrdersApi, type WorkOrder } from '@/features/work-orders/api'
import { toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/**
 * En el presupuesto aprobado: la OT que nació de él (una por presupuesto) o el botón para generarla.
 */
export function BudgetWorkOrder({ budget }: { budget: Budget }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const params = { budget_id: budget.id, per_page: 1 }

  const query = useQuery({
    queryKey: ['work-orders', params],
    queryFn: () => workOrdersApi.list(params),
    enabled: can('work-orders.index'),
  })
  const workOrder = query.data?.items[0]

  if (workOrder) {
    return (
      <div className="card mt-3">
        <div className="card-body d-flex align-items-center gap-2">
          <IconTool size={20} className="text-secondary" aria-hidden="true" />
          <div className="flex-fill">
            Orden de trabajo{' '}
            {can('work-orders.show') ? <Link to={`/work-orders/${workOrder.id}`}>{workOrder.code}</Link> : workOrder.code}
          </div>
          <StatusBadge value={workOrder.status.value} map={WORK_ORDER_STATUS} />
        </div>
      </div>
    )
  }

  if (budget.status !== 'approved' || !can('work-orders.store') || query.isLoading) return null

  return (
    <>
      <div className="card mt-3">
        <div className="card-body">
          <p className="text-secondary mb-2">Presupuesto aprobado: genere la orden de trabajo para empezar la reparación.</p>
          <button type="button" className="btn btn-primary w-100" onClick={() => setCreating(true)}>
            <IconTool size={18} className="me-1" aria-hidden="true" />
            Generar orden de trabajo
          </button>
        </div>
      </div>
      {creating && (
        <CreateWorkOrderModal
          budget={budget}
          onClose={() => setCreating(false)}
          onCreated={(created) => (can('work-orders.show') ? navigate(`/work-orders/${created.id}`) : undefined)}
        />
      )}
    </>
  )
}

function CreateWorkOrderModal({ budget, onClose, onCreated }: { budget: Budget; onClose: () => void; onCreated: (workOrder: WorkOrder) => void }) {
  const { can } = useAuth()
  const mechanics = useActiveMechanics(can('mechanics.index'))
  const [mechanicId, setMechanicId] = useState('')

  const mutation = useApiMutation(() => workOrdersApi.create(budget.id, toNumber(mechanicId)), {
    // La recepción pasa a "En proceso" con la OT pendiente.
    invalidate: [['work-orders'], ['receptions'], ['budgets']],
    successMessage: 'Orden de trabajo generada.',
    onSuccess: (workOrder) => {
      onClose()
      onCreated(workOrder)
    },
  })
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Orden de trabajo · ${budget.code}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Generar">
      <p className="text-secondary">
        Se crea un trabajo por cada ítem del presupuesto y se intenta reservar el stock de los repuestos (sin stock quedan
        pendientes).
      </p>
      <SelectField
        label="Mecánico responsable"
        name="mechanic_id"
        required
        value={mechanicId}
        onChange={(event) => setMechanicId(event.target.value)}
        errors={errors}
        hint="Los trabajos de mano de obra y servicio quedan asignados a él al 100 %; después se pueden repartir."
      >
        <option value="">Seleccione un mecánico</option>
        {mechanics.data?.map((mechanic) => (
          <option key={mechanic.id} value={mechanic.id}>
            {mechanic.user?.full_name ?? mechanic.employee_code}
          </option>
        ))}
      </SelectField>
    </FormModal>
  )
}
