import { useState } from 'react'
import { FormField, TextareaField, TextField } from '@/components/ui/FormField'
import { FormModal } from '@/components/ui/FormModal'
import { SearchPicker } from '@/components/ui/SearchPicker'
import {
  CLAIM_TYPES,
  claimFormValues,
  claimsApi,
  claimUpdateInput,
  newClaimInput,
  type Claim,
  type ClaimFormValues,
  type ClaimType,
} from '@/features/claims/api'
import { insurersApi, type InsurerSummary } from '@/features/insurers/api'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

const INVALIDATE = [['claims'], ['receptions']]

/**
 * Alta de un siniestro desde su recepción (abierta) o edición de uno abierto. Recepción, aseguradora y tipo no cambian
 * al editar: para corregirlos se cancela y se registra otro.
 */
export function ClaimFormModal({
  receptionId,
  claim,
  onClose,
  onSaved,
}: {
  receptionId?: number
  claim?: Claim
  onClose: () => void
  onSaved?: (claim: Claim) => void
}) {
  const [values, setValues] = useState<ClaimFormValues>(() => claimFormValues(claim))
  const [insurer, setInsurer] = useState<InsurerSummary | null>(null)
  const set = <K extends keyof ClaimFormValues>(key: K, value: ClaimFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const mutation = useApiMutation(
    () =>
      claim
        ? claimsApi.update(claim.id, claimUpdateInput(values))
        : claimsApi.create(newClaimInput(receptionId as number, { ...values, insurer_id: insurer?.id ?? null })),
    {
      invalidate: INVALIDATE,
      successMessage: claim ? 'Siniestro actualizado.' : 'Siniestro registrado.',
      onSuccess: (saved) => {
        onClose()
        onSaved?.(saved)
      },
    },
  )
  const errors = validationErrors(mutation.error)
  const field = (key: keyof ClaimFormValues) => ({
    name: key,
    value: values[key] as string,
    errors,
    onChange: (event: { target: { value: string } }) => set(key, event.target.value as never),
  })
  const thirdParty = values.claim_type === 'third_party'

  return (
    <FormModal
      title={claim ? `Editar siniestro ${claim.code}` : 'Registrar siniestro'}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      size="xl"
    >
      <div className="row">
        <div className="col-md-6">
          {claim ? (
            <FormField label="Aseguradora">
              <div className="form-control-plaintext">{claim.insurer?.name ?? '—'}</div>
            </FormField>
          ) : (
            <SearchPicker<InsurerSummary>
              label="Aseguradora"
              required
              queryKey={['insurers', 'picker']}
              search={(text) => insurersApi.list({ search: text, status: 'active', per_page: 8 }).then((page) => page.items)}
              value={insurer}
              onChange={setInsurer}
              getKey={(item) => item.id}
              renderItem={(item) => (
                <>
                  <div>{item.client?.display_name}</div>
                  <div className="small text-secondary">
                    {item.code} · {item.client?.document_number}
                  </div>
                </>
              )}
              placeholder="Buscar por razón social, RUC o código…"
              emptyMessage="No hay aseguradoras activas con ese dato."
              error={errors?.insurer_id}
            />
          )}
        </div>
        <div className="col-md-6">
          <FormField label="Tipo" required={!claim} error={errors?.claim_type}>
            {claim ? (
              <div className="form-control-plaintext">{claim.claim_type.label}</div>
            ) : (
              <div className="form-selectgroup" role="radiogroup" aria-label="Tipo de siniestro">
                {(Object.keys(CLAIM_TYPES) as ClaimType[]).map((type) => (
                  <label key={type} className="form-selectgroup-item">
                    <input
                      type="radio"
                      name="claim_type"
                      value={type}
                      className="form-selectgroup-input"
                      checked={values.claim_type === type}
                      onChange={() => set('claim_type', type)}
                    />
                    <span className="form-selectgroup-label">{CLAIM_TYPES[type]}</span>
                  </label>
                ))}
              </div>
            )}
          </FormField>
        </div>
        <div className="col-md-4">
          <TextField label="Fecha del siniestro" type="date" required {...field('loss_date')} />
        </div>
        <div className="col-md-4">
          <TextField label="Número de siniestro" maxLength={50} hint="Lo asigna la aseguradora; no se repite en ella." {...field('claim_number')} />
        </div>
        <div className="col-md-4">
          <TextField label="Póliza" maxLength={50} {...field('policy_number')} />
        </div>
        <div className="col-12">
          <TextareaField label="Descripción del siniestro" rows={2} maxLength={2000} {...field('loss_description')} />
        </div>
      </div>

      <h4 className="mt-2">Asegurado</h4>
      <div className="row">
        <div className="col-md-6">
          <TextField
            label="Nombre"
            required={thirdParty}
            maxLength={150}
            hint={thirdParty ? 'Obligatorio en un siniestro de tercero.' : 'Vacío en uno propio: se copia el cliente de la recepción.'}
            {...field('insured_name')}
          />
        </div>
        <div className="col-md-6">
          <TextField label="Documento" maxLength={30} {...field('insured_document')} />
        </div>
        <div className="col-md-6">
          <TextField label="Teléfono" type="tel" {...field('insured_phone')} />
        </div>
        <div className="col-md-6">
          <TextField label="Email" type="email" maxLength={100} {...field('insured_email')} />
        </div>
      </div>

      <h4 className="mt-2">Perito e inspección</h4>
      <div className="row">
        <div className="col-md-4">
          <TextField label="Perito" maxLength={150} {...field('adjuster_name')} />
        </div>
        <div className="col-md-4">
          <TextField label="Teléfono del perito" type="tel" {...field('adjuster_phone')} />
        </div>
        <div className="col-md-4">
          <TextField label="Email del perito" type="email" maxLength={100} {...field('adjuster_email')} />
        </div>
        <div className="col-md-6">
          <TextField label="Inspección agendada" type="datetime-local" {...field('inspection_scheduled_at')} />
        </div>
        <div className="col-md-6">
          <TextField label="Inspección realizada" type="datetime-local" {...field('inspected_at')} />
        </div>
      </div>

      <h4 className="mt-2">Cobertura</h4>
      <div className="row">
        <div className="col-md-4">
          <TextField
            label="Deducible"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            hint="Vacío = desconocido; 0 = sin deducible. Mayor a 0 o desconocido: no se factura ni se entrega por el flujo habitual."
            {...field('deductible_amount')}
          />
        </div>
        <div className="col-md-8">
          <TextareaField label="Notas de cobertura" rows={2} maxLength={2000} {...field('coverage_notes')} />
        </div>
      </div>
    </FormModal>
  )
}
