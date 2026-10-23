import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconAdjustmentsHorizontal, IconCalendarCheck } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { TextareaField, TextField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { intervalLabel, MAINTENANCE_STATUS, maintenanceApi, useMaintenancePlans, type VehicleMaintenance } from '@/features/maintenance/api'
import { formatDate, todayInput } from '@/lib/format'
import { nullIfEmpty, toInput, toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

const km = (value: number | null) => (value === null ? '—' : `${new Intl.NumberFormat('es-PY').format(value)} km`)

/** Cuánto falta (o cuánto pasó, si es negativo) para el próximo vencimiento. */
function remainingLabel(maintenance: VehicleMaintenance): string {
  const parts = [
    maintenance.remaining_km !== null && (maintenance.remaining_km < 0 ? `pasado ${km(-maintenance.remaining_km)}` : `faltan ${km(maintenance.remaining_km)}`),
    maintenance.remaining_days !== null &&
      (maintenance.remaining_days < 0 ? `hace ${-maintenance.remaining_days} día(s)` : `en ${maintenance.remaining_days} día(s)`),
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

/**
 * Estado de cada plan en el vehículo. Se registra solo al completar una OT con el servicio del plan; acá se carga a mano
 * (trabajo hecho en otro taller o carga inicial) y se ajustan los intervalos propios del vehículo.
 */
export function VehicleMaintenanceTab({ vehicleId }: { vehicleId: number }) {
  const { can } = useAuth()
  const [recording, setRecording] = useState<VehicleMaintenance | null>(null)
  const [configuring, setConfiguring] = useState<VehicleMaintenance | null>(null)
  const query = useQuery({ queryKey: ['vehicle-maintenances', vehicleId], queryFn: () => maintenanceApi.forVehicle(vehicleId) })
  const current = query.data?.current_mileage

  const columns: Column<VehicleMaintenance>[] = [
    {
      key: 'plan',
      header: 'Plan',
      render: (maintenance) => (
        <>
          <div>
            {maintenance.plan}
            {!maintenance.is_active && <span className="badge bg-secondary-lt ms-1">Plan inactivo</span>}
          </div>
          <div className="small text-secondary">
            {intervalLabel(maintenance.interval_km, maintenance.interval_days)}
            {maintenance.is_custom_interval && ' (propio del vehículo)'}
          </div>
        </>
      ),
    },
    {
      key: 'last',
      header: 'Último',
      render: (maintenance) =>
        maintenance.last_done_at ? (
          <>
            <div className="text-nowrap">{formatDate(maintenance.last_done_at)}</div>
            <div className="small text-secondary">
              {km(maintenance.last_done_mileage)}
              {maintenance.work_order_id && (
                <>
                  {' · '}
                  {can('work-orders.show') ? <Link to={`/work-orders/${maintenance.work_order_id}`}>OT</Link> : 'OT'}
                </>
              )}
            </div>
          </>
        ) : (
          <span className="text-secondary">Sin registro</span>
        ),
    },
    {
      key: 'next',
      header: 'Próximo',
      render: (maintenance) => (
        <>
          <div className="text-nowrap">{[maintenance.next_due_at && formatDate(maintenance.next_due_at), maintenance.next_due_mileage !== null && km(maintenance.next_due_mileage)].filter(Boolean).join(' · ') || '—'}</div>
          <div className="small text-secondary">{remainingLabel(maintenance)}</div>
        </>
      ),
    },
    { key: 'status', header: 'Estado', render: (maintenance) => <StatusBadge value={maintenance.status.value} map={MAINTENANCE_STATUS} /> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (maintenance) => (
        <>
          {maintenance.is_active && can('vehicle-maintenances.record') && (
            <IconButton label={`Registrar ${maintenance.plan}`} icon={IconCalendarCheck} onClick={() => setRecording(maintenance)} />
          )}
          {can('vehicle-maintenances.configure') && (
            <IconButton label={`Intervalos de ${maintenance.plan}`} icon={IconAdjustmentsHorizontal} onClick={() => setConfiguring(maintenance)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      {current && (
        <p className="text-secondary">
          Kilometraje actual{current.estimated && ' estimado'}: <strong>{km(current.mileage)}</strong>
          {current.estimated && current.daily_average !== null && ` (promedio ${new Intl.NumberFormat('es-PY').format(current.daily_average)} km/día`}
          {current.estimated && current.last_reading_at && ` desde la lectura del ${formatDate(current.last_reading_at)})`}.
        </p>
      )}
      <DataTable
        columns={columns}
        rows={query.data?.maintenances}
        rowKey={(maintenance) => maintenance.maintenance_plan_id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="No hay planes de mantenimiento activos."
      />
      <div className="small text-secondary mt-2">
        Completar una OT con el servicio de un plan lo registra solo (fecha de cierre y km de la recepción).
      </div>
      {recording && <RecordModal vehicleId={vehicleId} maintenance={recording} currentMileage={current?.mileage ?? null} onClose={() => setRecording(null)} />}
      {configuring && <ConfigureModal vehicleId={vehicleId} maintenance={configuring} onClose={() => setConfiguring(null)} />}
    </>
  )
}

function RecordModal({
  vehicleId,
  maintenance,
  currentMileage,
  onClose,
}: {
  vehicleId: number
  maintenance: VehicleMaintenance
  currentMileage: number | null
  onClose: () => void
}) {
  const [doneAt, setDoneAt] = useState(todayInput())
  const [mileage, setMileage] = useState(toInput(currentMileage))
  const [notes, setNotes] = useState('')

  const mutation = useApiMutation(
    () => maintenanceApi.record(vehicleId, { maintenance_plan_id: maintenance.maintenance_plan_id, done_at: doneAt, mileage: toNumber(mileage), notes: nullIfEmpty(notes) }),
    { invalidate: [['vehicle-maintenances'], ['maintenance-alerts']], successMessage: 'Mantenimiento registrado.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Registrar · ${maintenance.plan}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Registrar">
      <p className="text-secondary">Para un trabajo hecho fuera del taller o una carga inicial. No puede ser anterior al último registro.</p>
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Fecha"
            name="done_at"
            required
            type="date"
            min={maintenance.last_done_at ?? undefined}
            max={todayInput()}
            value={doneAt}
            onChange={(event) => setDoneAt(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-6">
          <TextField
            label="Kilometraje"
            name="mileage"
            type="number"
            inputMode="numeric"
            min={maintenance.last_done_mileage ?? 0}
            step={1}
            value={mileage}
            onChange={(event) => setMileage(event.target.value)}
            errors={errors}
            hint={maintenance.last_done_mileage !== null ? `Último: ${km(maintenance.last_done_mileage)}.` : 'Opcional.'}
          />
        </div>
      </div>
      <TextareaField label="Notas" name="notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}

type ConfigureProps = { vehicleId: number; maintenance: VehicleMaintenance; onClose: () => void }

/** Intervalos propios del vehículo; vacíos vuelven a los del plan. */
function ConfigureModal(props: ConfigureProps) {
  const plans = useMaintenancePlans()
  const plan = plans.data?.find((item) => item.id === props.maintenance.maintenance_plan_id)

  // Se espera al plan: el backend da los intervalos efectivos y solo se precargan los que difieren de los del plan.
  if (!plans.data) return null
  return <ConfigureForm {...props} planKm={plan?.interval_km ?? null} planDays={plan?.interval_days ?? null} />
}

function ConfigureForm({ vehicleId, maintenance, onClose, planKm, planDays }: ConfigureProps & { planKm: number | null; planDays: number | null }) {
  const [intervalKm, setIntervalKm] = useState(maintenance.interval_km !== planKm ? toInput(maintenance.interval_km) : '')
  const [intervalDays, setIntervalDays] = useState(maintenance.interval_days !== planDays ? toInput(maintenance.interval_days) : '')
  const [notes, setNotes] = useState(maintenance.notes ?? '')

  const mutation = useApiMutation(
    () =>
      maintenanceApi.configure(vehicleId, maintenance.maintenance_plan_id, {
        interval_km: toNumber(intervalKm),
        interval_days: toNumber(intervalDays),
        notes: nullIfEmpty(notes),
      }),
    { invalidate: [['vehicle-maintenances'], ['maintenance-alerts']], successMessage: 'Intervalos actualizados.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Intervalos · ${maintenance.plan}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      <p className="text-secondary">
        Para este vehículo (p. ej. uso intensivo). Vacíos: los del plan, {intervalLabel(planKm, planDays)}.
      </p>
      <div className="row">
        <div className="col-6">
          <TextField
            label="Cada (km)"
            name="interval_km"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={intervalKm}
            onChange={(event) => setIntervalKm(event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-6">
          <TextField
            label="Cada (días)"
            name="interval_days"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={intervalDays}
            onChange={(event) => setIntervalDays(event.target.value)}
            errors={errors}
          />
        </div>
      </div>
      <TextareaField label="Notas" name="notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}
