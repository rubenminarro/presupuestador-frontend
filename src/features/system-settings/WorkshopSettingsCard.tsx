import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { SelectField, TextField } from '@/components/ui/FormField'
import { ErrorState, LoadingState } from '@/components/ui/States'
import {
  changedWorkshopSettings,
  systemSettingsApi,
  WORKSHOP_SETTINGS_KEY,
  workshopSettingsValues,
  type WorkshopSettings,
  type WorkshopSettingsValues,
} from '@/features/system-settings/api'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/** Datos del taller: encabezan los comprobantes y definen el IVA por defecto, el remitente y los recordatorios. */
export function WorkshopSettingsCard() {
  const query = useQuery({ queryKey: WORKSHOP_SETTINGS_KEY, queryFn: systemSettingsApi.workshop })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Datos del taller</h3>
      </div>
      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {/* La key recrea el formulario con lo guardado después de cada cambio. */}
      {query.data && <WorkshopSettingsForm key={JSON.stringify(query.data)} settings={query.data} />}
    </div>
  )
}

function WorkshopSettingsForm({ settings }: { settings: WorkshopSettings }) {
  const initial = workshopSettingsValues(settings)
  const [values, setValues] = useState(initial)
  const set = (key: keyof WorkshopSettingsValues, value: string) => setValues((current) => ({ ...current, [key]: value }))

  const changes = changedWorkshopSettings(initial, values)
  const hasChanges = Object.keys(changes).length > 0

  const mutation = useApiMutation(() => systemSettingsApi.updateWorkshop(changes), {
    invalidate: [WORKSHOP_SETTINGS_KEY],
    successMessage: 'Se actualizaron los datos del taller.',
    onSuccess: ({ meta }) => meta?.warnings?.forEach((warning) => toast.warning(warning)),
  })
  const errors = validationErrors(mutation.error)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  const text = (key: keyof WorkshopSettingsValues, label: string, hint?: string, type = 'text') => (
    <TextField label={label} name={key} type={type} hint={hint} errors={errors} value={values[key]} onChange={(event) => set(key, event.target.value)} />
  )

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="card-body">
        <p className="text-secondary">Un campo vacío vuelve al valor por defecto de la instalación.</p>

        <h4>Comprobantes y reportes</h4>
        <div className="row">
          <div className="col-md-6">{text('company_name', 'Nombre del taller')}</div>
          <div className="col-md-6">{text('company_legal_name', 'Razón social')}</div>
          <div className="col-md-6">{text('company_tax_id', 'RUC')}</div>
          <div className="col-md-6">{text('company_activity', 'Actividad')}</div>
          <div className="col-md-6">{text('company_address', 'Dirección')}</div>
          <div className="col-md-6">{text('company_city', 'Ciudad')}</div>
          <div className="col-md-6">{text('company_phone', 'Teléfono')}</div>
          <div className="col-md-6">{text('company_email', 'Email', undefined, 'email')}</div>
        </div>

        <h4>IVA</h4>
        <div className="row">
          <div className="col-md-6">
            <SelectField
              label="Tasa de IVA por defecto"
              name="default_tax_rate"
              errors={errors}
              value={values.default_tax_rate}
              onChange={(event) => set('default_tax_rate', event.target.value)}
            >
              <option value="10">IVA 10%</option>
              <option value="5">IVA 5%</option>
              <option value="0">Exenta</option>
            </SelectField>
          </div>
        </div>
        {values.default_tax_rate !== initial.default_tax_rate && (
          <div className="alert alert-warning" role="alert">
            La tasa nueva se aplica a los cálculos desde que guardes, también en los documentos en curso: un presupuesto ya
            aprobado se facturará con esta tasa. Lo ya emitido no cambia.
          </div>
        )}

        <h4>Avisos por email</h4>
        <div className="row">
          <div className="col-md-6">{text('mail_from_name', 'Nombre del remitente')}</div>
          <div className="col-md-6">
            {text('mail_from_address', 'Email del remitente', 'Debe estar autorizado en el servidor de correo.', 'email')}
          </div>
          <div className="col-md-4">{text('reminders_at', 'Hora de los recordatorios', 'Hora de Paraguay.', 'time')}</div>
          <div className="col-md-4">
            {text('invoice_due_soon_days', 'Avisar antes del vencimiento', 'Días antes de vencer la factura.', 'number')}
          </div>
          <div className="col-md-4">
            {text('invoice_overdue_repeat_days', 'Repetir si está vencida', 'Cada cuántos días.', 'number')}
          </div>
        </div>
      </div>
      <div className="card-footer text-end">
        <button type="submit" className="btn btn-primary" disabled={!hasChanges || mutation.isPending}>
          {mutation.isPending && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Guardar
        </button>
      </div>
    </form>
  )
}
