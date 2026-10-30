import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { IconChartPie, IconCircleCheck, IconCircleX, IconDeviceFloppy, IconFileInvoice, IconRefresh, IconTool, IconTrash } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { TextareaField, TextField } from '@/components/ui/FormField'
import { FormModal } from '@/components/ui/FormModal'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  ALLOCATION_ROLE_LABEL,
  ALLOCATION_STATUS,
  PORTION_TYPES,
  allocationLinesInput,
  allocationsApi,
  conceptDifference,
  conceptKey,
  gridFromAllocation,
  portionApplies,
  toCents,
  type Allocation,
  type AllocationGrid,
  type AllocationPendingInvoice,
  type PortionType,
} from '@/features/allocations/api'
import { useAuth } from '@/features/auth/useAuth'
import { claimsApi, type Claim } from '@/features/claims/api'
import { INVOICE_PAYMENT_STATUS, INVOICE_STATUS } from '@/features/invoices/api'
import { internalExceptionsApi, type InternalException } from '@/features/internal-exceptions/api'
import type { WorkOrder } from '@/features/work-orders/api'
import { formatDateTime, formatGuarani, formatMoney } from '@/lib/format'
import { useApiMutation } from '@/lib/useApiMutation'
import { isApiError, validationErrors } from '@/services/api'

/**
 * Reparto económico de la OT de un siniestro (M8) y sus facturas por responsable (M9). Lo gestiona el cajero: genera el
 * borrador (propuesta del backend o copia de la confirmada), lo edita por concepto, revisa las reglas y lo confirma. El
 * jefe de taller otorga la absorción del taller. Importes sin IVA; las facturas, con IVA.
 */
export function WorkOrderAllocation({ workOrder }: { workOrder: WorkOrder }) {
  const { can } = useAuth()
  const [dialog, setDialog] = useState<'generate' | 'absorption' | null>(null)
  const visible = Boolean(workOrder.requires_allocation) && can('work-order-allocations.show')

  const versions = useQuery({
    queryKey: ['work-orders', 'allocations', workOrder.id],
    queryFn: () => allocationsApi.list(workOrder.id),
    enabled: visible,
  })
  const absorption = useQuery({
    queryKey: ['internal-exceptions', 'absorption', workOrder.id],
    queryFn: () => internalExceptionsApi.availableAbsorption(workOrder.id),
    enabled: visible && can('internal-exceptions.index'),
  })
  const claim = useQuery({
    queryKey: ['claims', 'reception', workOrder.reception_id],
    queryFn: () => claimsApi.forReception(workOrder.reception_id),
    enabled: visible && can('claims.show'),
  })

  const queryClient = useQueryClient()
  const generate = useApiMutation(() => withRefresh(queryClient, allocationsApi.generate(workOrder.id)), {
    invalidate: [['work-orders']],
    successMessage: 'Reparto generado en borrador.',
    onSuccess: () => setDialog(null),
  })

  if (!visible) return null

  const all = [...(versions.data ?? [])].sort((a, b) => b.version - a.version)
  const draft = all.find((allocation) => allocation.status.value === 'draft')
  const confirmed = all.find((allocation) => allocation.status.value === 'confirmed')
  const superseded = all.filter((allocation) => allocation.status.value === 'superseded')
  const completed = workOrder.status.value === 'completed'
  const canGenerate = completed && !draft && can('work-order-allocations.store')
  const canGrant = workOrder.status.value !== 'cancelled' && can('internal-exceptions.grant') && absorption.isSuccess && !absorption.data

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <IconChartPie size={20} className="me-2 text-secondary" aria-hidden="true" />
          Reparto (sin IVA)
        </h3>
        <div className="card-actions d-flex gap-2">
          {canGrant && (
            <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => setDialog('absorption')}>
              <IconTool size={16} className="me-1" aria-hidden="true" />
              Otorgar absorción del taller
            </button>
          )}
          {canGenerate && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setDialog('generate')}>
              <IconRefresh size={16} className="me-1" aria-hidden="true" />
              {confirmed ? 'Corregir reparto' : 'Generar reparto'}
            </button>
          )}
        </div>
      </div>

      {versions.error ? (
        <ErrorState error={versions.error} onRetry={() => void versions.refetch()} />
      ) : !versions.data ? (
        <LoadingState />
      ) : (
        <>
          {absorption.data && <AbsorptionNotice exception={absorption.data} />}
          {all.length === 0 && (
            <div className="card-body text-secondary">
              {completed
                ? 'Todavía no tiene reparto. Lo genera el cajero: el sistema propone lo cubierto por la aseguradora hasta lo autorizado y el resto al dueño.'
                : 'Se reparte cuando la orden de trabajo esté completada.'}
            </div>
          )}
          {draft && <DraftAllocation key={draft.id} workOrder={workOrder} allocation={draft} absorption={absorption.data ?? null} />}
          {confirmed && <ConfirmedAllocation workOrder={workOrder} allocation={confirmed} claim={claim.data ?? null} />}
          {superseded.length > 0 && (
            <div className="card-footer small text-secondary">
              Versiones anteriores:{' '}
              {superseded.map((allocation, index) => (
                <span key={allocation.id}>
                  {index > 0 && ' · '}v{allocation.version} sustituida {formatDateTime(allocation.superseded_at)} (
                  {formatMoney(allocation.summary.total)})
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={dialog === 'generate'}
        title={confirmed ? 'Corregir reparto' : 'Generar reparto'}
        message={
          confirmed ? (
            <>
              Se crea la versión {(all[0]?.version ?? 0) + 1} en borrador como copia de la confirmada. Al confirmarla, la actual
              queda sustituida; antes hay que eliminar los borradores de sus facturas y acreditar o anular las emitidas.
            </>
          ) : (
            <>Se crea un borrador con la propuesta del sistema a partir del cierre de la OT y la autorización vigente.</>
          )
        }
        confirmLabel="Generar borrador"
        isLoading={generate.isPending}
        onConfirm={() => generate.mutate()}
        onClose={() => setDialog(null)}
      />
      {dialog === 'absorption' && (
        <AbsorptionModal workOrder={workOrder} suggested={draft ? workshopTotal(draft) : null} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}

/**
 * Espera a que se recarguen la OT y sus versiones antes de dar el éxito: al cambiar de versión, la anterior no debe
 * seguir ofreciendo acciones (p. ej. facturar la sustituida).
 */
async function withRefresh<T>(queryClient: QueryClient, request: Promise<T>): Promise<T> {
  const result = await request
  await queryClient.invalidateQueries({ queryKey: ['work-orders'] })
  return result
}

function workshopTotal(allocation: Allocation): string | null {
  const cents = allocation.lines
    .filter((line) => line.portion_type.value === 'workshop_absorbed')
    .reduce((sum, line) => sum + toCents(line.amount), 0)
  return cents > 0 ? String(cents / 100) : null
}

function AbsorptionNotice({ exception }: { exception: InternalException }) {
  return (
    <div className="card-body border-bottom small">
      <strong>Absorción del taller disponible</strong> por {formatMoney(exception.amount)}, otorgada {formatDateTime(exception.granted_at)}
      {exception.granted_by && ` por ${exception.granted_by.name}`}: {exception.reason}
      <div className="text-secondary">La columna "Taller" del borrador la usa; se consume al confirmar el reparto.</div>
    </div>
  )
}

function DraftAllocation({ workOrder, allocation, absorption }: { workOrder: WorkOrder; allocation: Allocation; absorption: InternalException | null }) {
  const { can } = useAuth()
  const editable = can('work-order-allocations.update')
  const initialGrid = useMemo(() => gridFromAllocation(allocation), [allocation])
  const initialDeductible = allocation.deductible_amount === null ? '' : String(Number(allocation.deductible_amount))
  const [grid, setGrid] = useState<AllocationGrid>(initialGrid)
  const [deductible, setDeductible] = useState(initialDeductible)
  const [notes, setNotes] = useState(allocation.notes ?? '')
  const [dialog, setDialog] = useState<'confirm' | 'discard' | null>(null)

  const lines = allocationLinesInput(allocation, grid, absorption?.id ?? null)
  const dirty =
    JSON.stringify(lines) !== JSON.stringify(allocationLinesInput(allocation, initialGrid, absorption?.id ?? null)) ||
    deductible.trim() !== initialDeductible ||
    notes.trim() !== (allocation.notes ?? '')

  const save = useApiMutation(
    () =>
      allocationsApi.update(workOrder.id, allocation.id, {
        lines,
        ...(deductible.trim() !== '' && { deductible_amount: deductible.trim() }),
        notes: notes.trim() === '' ? null : notes.trim(),
      }),
    { invalidate: [['work-orders']], successMessage: 'Reparto guardado.' },
  )
  const queryClient = useQueryClient()
  const confirm = useApiMutation(() => withRefresh(queryClient, allocationsApi.confirm(workOrder.id, allocation.id)), {
    invalidate: [['work-orders'], ['internal-exceptions'], ['claims']],
    successMessage: 'Reparto confirmado.',
    onSuccess: () => setDialog(null),
  })
  const errors = validationErrors(save.error)
  const lineErrors = Object.entries(errors).filter(([field]) => field.startsWith('lines'))
  const pendingInvoices =
    isApiError(confirm.error) && confirm.error.code === 'ALLOCATION_HAS_INVOICES'
      ? ((confirm.error.errors as unknown as { invoices?: AllocationPendingInvoice[] } | null)?.invoices ?? [])
      : []
  const checks = allocation.checks ?? []
  const allOk = checks.every((check) => check.ok)

  return (
    <>
      <div className="card-body border-bottom">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <strong>Versión {allocation.version}</strong>
          <StatusBadge value={allocation.status.value} map={ALLOCATION_STATUS} />
          <span className="small text-secondary">
            Generado {formatDateTime(allocation.created_at)}
            {allocation.created_by && ` por ${allocation.created_by.name}`}
          </span>
        </div>
        <AllocationTable
          allocation={allocation}
          grid={grid}
          onChange={editable ? (key, type, value) => setGrid((current) => ({ ...current, [key]: { ...current[key], [type]: value } })) : undefined}
        />
        {lineErrors.length > 0 && (
          <div className="alert alert-danger mt-2 mb-0" role="alert">
            {lineErrors[0][1][0]}
          </div>
        )}
        <div className="row mt-3">
          <div className="col-12 col-md-4">
            <TextField
              label="Deducible de esta OT"
              name="deductible_amount"
              type="number"
              min={0}
              step="0.01"
              value={deductible}
              onChange={(event) => setDeductible(event.target.value)}
              errors={errors}
              disabled={!editable}
              hint="Parte del deducible del siniestro asignada a esta OT, tal como se informa."
            />
          </div>
          <div className="col-12 col-md-8">
            <TextareaField
              label="Notas"
              name="notes"
              rows={2}
              maxLength={1000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              errors={errors}
              disabled={!editable}
            />
          </div>
        </div>
      </div>

      <div className="card-body border-bottom">
        <h4 className="mb-2">Reglas para confirmar {dirty && <span className="small text-warning fw-normal">(según lo guardado)</span>}</h4>
        <ul className="list-unstyled mb-0">
          {checks.map((check) => (
            <li key={check.rule} className="d-flex gap-2 mb-1">
              {check.ok ? (
                <IconCircleCheck size={18} className="text-green flex-shrink-0" aria-label="Cumple" />
              ) : (
                <IconCircleX size={18} className="text-red flex-shrink-0" aria-label="No cumple" />
              )}
              <span className={check.ok ? 'text-secondary' : ''}>{check.ok ? (CHECK_LABELS[check.rule] ?? check.rule) : check.message}</span>
            </li>
          ))}
        </ul>
        {allocation.summary.warnings.map((warning) => (
          <div key={warning} className="alert alert-warning mt-2 mb-0" role="alert">
            {warning}
          </div>
        ))}
        {pendingInvoices.length > 0 && <PendingInvoices invoices={pendingInvoices} />}
      </div>

      <div className="card-body d-flex flex-wrap align-items-center gap-2">
        <Responsibles allocation={allocation} />
        <div className="ms-auto d-flex flex-wrap gap-2">
          {can('work-order-allocations.destroy') && (
            <button type="button" className="btn btn-outline-danger" onClick={() => setDialog('discard')}>
              <IconTrash size={18} className="me-1" aria-hidden="true" />
              Descartar
            </button>
          )}
          {editable && (
            <button type="button" className="btn btn-outline-primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              <IconDeviceFloppy size={18} className="me-1" aria-hidden="true" />
              Guardar
            </button>
          )}
          {can('work-order-allocations.confirm') && (
            <button
              type="button"
              className="btn btn-success"
              disabled={dirty || !allOk}
              title={dirty ? 'Guarde los cambios antes de confirmar.' : !allOk ? 'Hay reglas sin cumplir.' : undefined}
              onClick={() => setDialog('confirm')}
            >
              <IconCircleCheck size={18} className="me-1" aria-hidden="true" />
              Confirmar
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'confirm'}
        title="Confirmar reparto"
        message={
          <>
            ¿Confirmar la versión {allocation.version}? Queda inmutable: para cambiarla se genera otra versión. Si usa la absorción
            del taller, la excepción se consume.
          </>
        }
        confirmLabel="Confirmar"
        variant="primary"
        isLoading={confirm.isPending}
        onConfirm={() => confirm.mutate()}
        onClose={() => setDialog(null)}
      />
      {dialog === 'discard' && (
        <DeleteDialog
          title="Descartar borrador"
          message={`¿Descartar el borrador de la versión ${allocation.version}? Se elimina sin rastro; el reparto confirmado, si lo hay, no cambia.`}
          onDelete={() => allocationsApi.remove(workOrder.id, allocation.id)}
          invalidate={[['work-orders']]}
          successMessage="Borrador descartado."
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}

/** Texto de una regla cumplida; el `message` del backend describe la falla. */
const CHECK_LABELS: Record<string, string> = {
  deductible: 'Deducible de esta OT informado.',
  deductible_accepted: 'Deducible del siniestro aceptado por el dueño.',
  R1: 'Cada concepto vendido repartido completo.',
  R2: 'El total coincide con la venta del cierre.',
  R4: 'Extras y líneas del dueño fuera de la aseguradora.',
  R3: 'Lo cubierto por la aseguradora dentro de su autorización vigente.',
  R6: 'Lo absorbido por el taller está autorizado.',
  R5: 'La parte del dueño no supera lo que aceptó.',
  R7: 'Los deducibles asignados no superan el del siniestro.',
}

/** Una fila por concepto y una columna por tipo de porción; sin `onChange`, solo lectura. */
export function AllocationTable({
  allocation,
  grid,
  onChange,
}: {
  allocation: Pick<Allocation, 'concepts' | 'lines'>
  grid: AllocationGrid
  onChange?: (key: ReturnType<typeof conceptKey>, type: PortionType, value: string) => void
}) {
  const totals = PORTION_TYPES.map((type) =>
    allocation.concepts.reduce((sum, concept) => sum + toCents(grid[conceptKey(concept)]?.[type.value] ?? ''), 0),
  )
  const saleCents = allocation.concepts.reduce((sum, concept) => sum + toCents(concept.base_total), 0)
  const assignedCents = totals.reduce((sum, value) => sum + value, 0)

  return (
    <div className="table-responsive">
      <table className="table table-vcenter card-table table-sm mb-0">
        <thead>
          <tr>
            <th>Concepto</th>
            <th className="text-end">Total</th>
            {PORTION_TYPES.map((type) => (
              <th key={type.value} className="text-end" title={type.label}>
                {type.short}
              </th>
            ))}
            <th className="text-end">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {allocation.concepts.map((concept) => {
            const key = conceptKey(concept)
            const row = grid[key]
            const difference = conceptDifference(concept, row)
            return (
              <tr key={key}>
                <td>
                  <div>
                    {concept.description}
                    {concept.is_extra && <span className="badge bg-orange-lt ms-1">Extra</span>}
                    {concept.coverable && <span className="badge bg-azure-lt ms-1">Aseguradora</span>}
                  </div>
                  {concept.coverable && (
                    <div className="small text-secondary">
                      Autorizado para el ítem: {concept.authorized_total === null ? 'sin autorización vigente' : formatMoney(concept.authorized_total)}
                    </div>
                  )}
                </td>
                <td className="text-end text-nowrap">{formatMoney(concept.base_total)}</td>
                {PORTION_TYPES.map((type) => {
                  const value = row[type.value]
                  const applies = portionApplies(concept, type.value) || toCents(value) > 0
                  return (
                    <td key={type.value} className="text-end" style={{ minWidth: onChange ? '8rem' : undefined }}>
                      {!applies ? (
                        <span className="text-secondary">—</span>
                      ) : onChange ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="form-control form-control-sm text-end"
                          aria-label={`${type.short}: ${concept.description}`}
                          value={value}
                          onChange={(event) => onChange(key, type.value, event.target.value)}
                        />
                      ) : toCents(value) > 0 ? (
                        <span className="text-nowrap">{formatMoney(value)}</span>
                      ) : (
                        <span className="text-secondary">0</span>
                      )}
                    </td>
                  )
                })}
                <td className={`text-end text-nowrap ${difference === 0 ? 'text-secondary' : 'text-red fw-bold'}`}>
                  {difference === 0 ? '0' : formatMoney(difference / 100)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="fw-bold">
            <td>Total</td>
            <td className="text-end text-nowrap">{formatMoney(saleCents / 100)}</td>
            {totals.map((cents, index) => (
              <td key={PORTION_TYPES[index].value} className="text-end text-nowrap">
                {formatMoney(cents / 100)}
              </td>
            ))}
            <td className={`text-end text-nowrap ${saleCents === assignedCents ? 'text-secondary' : 'text-red'}`}>
              {formatMoney((saleCents - assignedCents) / 100)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Responsibles({ allocation }: { allocation: Allocation }) {
  return (
    <div className="d-flex flex-wrap gap-3">
      {allocation.summary.responsibles.map((responsible) => (
        <div key={responsible.client_id ?? 'workshop'}>
          <div className="small text-secondary">{ALLOCATION_ROLE_LABEL[responsible.role]}</div>
          <div>
            {responsible.role !== 'workshop' && `${responsible.name} · `}
            <strong>{formatMoney(responsible.amount)}</strong>
          </div>
        </div>
      ))}
    </div>
  )
}

function PendingInvoices({ invoices }: { invoices: AllocationPendingInvoice[] }) {
  return (
    <div className="alert alert-danger mt-2 mb-0" role="alert">
      <div className="mb-1">Facturas vigentes de la versión confirmada (elimine los borradores y acredite o anule las emitidas):</div>
      <ul className="mb-0">
        {invoices.map((invoice) => (
          <li key={invoice.invoice_id}>
            <Link to={`/invoices/${invoice.invoice_id}`}>{invoice.number ?? 'Borrador'}</Link> · {invoice.customer_name}
            {invoice.has_payments && ' · con pagos'}
            {Number(invoice.credited_total) > 0 && ` · acreditado ${formatGuarani(invoice.credited_total)}`}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Por qué no se factura todavía: el deducible del siniestro debe estar informado y ser 0 (A; mayor a 0 espera M10). */
function billingBlock(claim: Claim | null): string | null {
  if (!claim) return null
  if (claim.deductible_amount === null) return 'El deducible del siniestro es desconocido: infórmelo en el siniestro para poder facturar.'
  if (Number(claim.deductible_amount) > 0)
    return 'El siniestro tiene deducible: su facturación todavía no está disponible (falta definir la modalidad). El reparto queda confirmado.'
  return null
}

function ConfirmedAllocation({ workOrder, allocation, claim }: { workOrder: WorkOrder; allocation: Allocation; claim: Claim | null }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [invoicing, setInvoicing] = useState<{ clientId: number; name: string } | null>(null)
  const grid = useMemo(() => gridFromAllocation(allocation), [allocation])
  const blocked = billingBlock(claim)
  const invoices = (workOrder.invoices ?? []).filter((invoice) => invoice.allocation_id === allocation.id)

  const create = useApiMutation((clientId: number) => allocationsApi.invoice(workOrder.id, allocation.id, clientId), {
    invalidate: [['invoices'], ['work-orders']],
    successMessage: 'Factura generada en borrador.',
    onSuccess: (invoice) => {
      setInvoicing(null)
      navigate(`/invoices/${invoice.id}`)
    },
  })

  return (
    <>
      <div className="card-body border-bottom">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <strong>Versión {allocation.version}</strong>
          <StatusBadge value={allocation.status.value} map={ALLOCATION_STATUS} />
          <span className="small text-secondary">
            Confirmado {formatDateTime(allocation.confirmed_at)}
            {allocation.confirmed_by && ` por ${allocation.confirmed_by.name}`}
          </span>
        </div>
        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Responsable</th>
                <th className="text-end">Sin IVA</th>
                <th>Factura (IVA incluido)</th>
                <th className="w-1" />
              </tr>
            </thead>
            <tbody>
              {allocation.summary.responsibles.map((responsible) => {
                const clientInvoices = invoices.filter((invoice) => invoice.client_id === responsible.client_id)
                const canInvoice =
                  responsible.client_id !== null && clientInvoices.length === 0 && !blocked && can('invoices.store')
                return (
                  <tr key={responsible.client_id ?? 'workshop'}>
                    <td>
                      <div>{responsible.name}</div>
                      {responsible.role !== 'workshop' && <div className="small text-secondary">{ALLOCATION_ROLE_LABEL[responsible.role]}</div>}
                    </td>
                    <td className="text-end text-nowrap">{formatMoney(responsible.amount)}</td>
                    <td>
                      {responsible.client_id === null ? (
                        <span className="text-secondary small">No se factura</span>
                      ) : clientInvoices.length === 0 ? (
                        <span className="text-secondary small">Sin facturar</span>
                      ) : (
                        clientInvoices.map((invoice) => (
                          <div key={invoice.id} className="d-flex flex-wrap align-items-center gap-1">
                            <Link to={`/invoices/${invoice.id}`}>{invoice.number ?? 'Borrador'}</Link>
                            <span className="small text-secondary">
                              {formatGuarani(invoice.total)}
                              {invoice.status.value === 'issued' && ` · saldo ${formatGuarani(invoice.balance)}`}
                            </span>
                            <StatusBadge value={invoice.status.value} map={INVOICE_STATUS} />
                            {invoice.payment_status && <StatusBadge value={invoice.payment_status} map={INVOICE_PAYMENT_STATUS} />}
                          </div>
                        ))
                      )}
                    </td>
                    <td className="text-nowrap">
                      {canInvoice && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setInvoicing({ clientId: responsible.client_id as number, name: responsible.name })}
                        >
                          <IconFileInvoice size={16} className="me-1" aria-hidden="true" />
                          Generar factura
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="small text-secondary mt-2">
          Deducible asignado a esta OT: {allocation.deductible_amount === null ? 'sin informar' : formatMoney(allocation.deductible_amount)}
        </div>
        {blocked && (
          <div className="alert alert-warning mt-2 mb-0" role="alert">
            {blocked}
          </div>
        )}
        {allocation.summary.warnings.map((warning) => (
          <div key={warning} className="alert alert-warning mt-2 mb-0" role="alert">
            {warning}
          </div>
        ))}
      </div>
      <details className="card-body">
        <summary className="text-secondary">Porciones por concepto</summary>
        <div className="mt-2">
          <AllocationTable allocation={allocation} grid={grid} />
        </div>
      </details>

      <ConfirmDialog
        open={invoicing !== null}
        title="Generar factura"
        message={
          <>
            ¿Generar la factura de <strong>{invoicing?.name}</strong> con sus porciones pendientes? Se crea en borrador (la de la
            aseguradora a crédito, la del dueño al contado); antes de emitirla se pueden ajustar sus datos.
          </>
        }
        confirmLabel="Generar borrador"
        isLoading={create.isPending}
        onConfirm={() => invoicing && create.mutate(invoicing.clientId)}
        onClose={() => setInvoicing(null)}
      />
    </>
  )
}

function AbsorptionModal({ workOrder, suggested, onClose }: { workOrder: WorkOrder; suggested: string | null; onClose: () => void }) {
  const [amount, setAmount] = useState(suggested ?? '')
  const [reason, setReason] = useState('')
  const mutation = useApiMutation(
    () =>
      internalExceptionsApi.create({
        type: 'workshop_absorption',
        subject_id: workOrder.id,
        amount: amount.trim() === '' ? null : Number(amount),
        reason: reason.trim(),
      }),
    { invalidate: [['internal-exceptions'], ['work-orders']], successMessage: 'Absorción del taller otorgada.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Absorción del taller · ${workOrder.code}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Otorgar">
      <p className="text-secondary">
        Autoriza que el taller absorba hasta este importe del reparto. No cambia lo que paga la aseguradora ni lo aceptado por
        el dueño; se consume al confirmar el reparto que la usa.
      </p>
      <TextField
        label="Importe máximo (sin IVA)"
        name="amount"
        type="number"
        min={0}
        step="0.01"
        required
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        errors={errors}
        hint={suggested ? 'Sugerido: lo que el borrador asigna al taller.' : undefined}
      />
      <TextareaField
        label="Motivo"
        name="reason"
        required
        rows={3}
        minLength={10}
        maxLength={1000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        errors={errors}
        hint="Entre 10 y 1000 caracteres; queda registrado con su nombre."
      />
    </FormModal>
  )
}
