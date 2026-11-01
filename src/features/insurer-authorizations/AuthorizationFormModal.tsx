import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconUpload } from '@tabler/icons-react'
import { FormField, SelectField, TextareaField, TextField } from '@/components/ui/FormField'
import { FormModal } from '@/components/ui/FormModal'
import type { Budget, BudgetItem } from '@/features/budgets/api'
import {
  CLAIM_DOCUMENT_ACCEPT,
  CLAIM_DOCUMENT_MAX_BYTES,
  CLAIM_DOCUMENT_TYPES,
  claimsApi,
  type Claim,
  type ClaimDocumentType,
} from '@/features/claims/api'
import {
  AUTHORIZATION_DECISIONS,
  authorizationInput,
  insurerAuthorizationsApi,
  type AuthorizationDecision,
  type AuthorizationHeader,
  type AuthorizationRow,
} from '@/features/insurer-authorizations/api'
import { CLIENT_DECISION_CHANNELS, type ClientDecisionChannel } from '@/features/work-orders/api'
import { formatDecimal, formatMoney, todayInput } from '@/lib/format'
import { toast } from '@/lib/toast'
import { useApiMutation } from '@/lib/useApiMutation'
import { isApiError, validationErrors } from '@/services/api'

/**
 * Registrar la autorización de la aseguradora (M6): una decisión por cada línea a su cargo, con tope en lo
 * presupuestado. La unidad de los importes (con o sin IVA) se elige siempre: no hay valor inicial (V2 sigue abierta).
 * Si la versión nueva autoriza más en alguna línea, el backend exige un documento del siniestro como evidencia.
 */
export function AuthorizationFormModal({ budget, claim, onClose }: { budget: Budget; claim: Claim; onClose: () => void }) {
  const insurerItems = (budget.items ?? []).filter((item) => item.responsibility.value === 'insurer')
  const [header, setHeader] = useState<AuthorizationHeader>({
    amounts_include_tax: null,
    decided_at: todayInput(),
    channel: '',
    authorization_number: '',
    adjuster_name: claim.adjuster.name ?? '',
    notes: '',
    document_ids: [],
  })
  const [rows, setRows] = useState<AuthorizationRow[]>(
    insurerItems.map((item) => ({ budget_item_id: item.id, decision: '', authorized_total: '', authorized_quantity: '', notes: '' })),
  )
  const setField = <K extends keyof AuthorizationHeader>(key: K, value: AuthorizationHeader[K]) =>
    setHeader((current) => ({ ...current, [key]: value }))
  const setRow = (index: number, patch: Partial<AuthorizationRow>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const toggleDocument = (id: number) =>
    setField('document_ids', header.document_ids.includes(id) ? header.document_ids.filter((doc) => doc !== id) : [...header.document_ids, id])

  const documents = useQuery({
    queryKey: ['claims', claim.id, 'documents'],
    queryFn: () => claimsApi.documents(claim.id),
  })
  const available = (documents.data ?? []).filter((document) => document.insurer_authorization_id === null)

  const mutation = useApiMutation(() => insurerAuthorizationsApi.create(budget.id, authorizationInput(header, rows)), {
    invalidate: [['budgets'], ['insurer-authorizations'], ['claims', claim.id, 'documents']],
    successMessage: 'Autorización registrada.',
    onSuccess: onClose,
  })
  const errors = validationErrors(mutation.error)
  const evidenceRequired = isApiError(mutation.error) && mutation.error.code === 'INSURER_AUTHORIZATION_EVIDENCE_REQUIRED'

  return (
    <FormModal
      title={`Autorización de la aseguradora · ${budget.code}`}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      isSubmitting={mutation.isPending}
      submitLabel="Registrar autorización"
      size="xl"
    >
      <div className="row">
        <div className="col-md-3">
          <TextField
            label="Fecha"
            name="decided_at"
            type="date"
            required
            value={header.decided_at}
            onChange={(event) => setField('decided_at', event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-3">
          <SelectField
            label="Medio"
            name="channel"
            required
            value={header.channel}
            onChange={(event) => setField('channel', event.target.value as ClientDecisionChannel | '')}
            errors={errors}
          >
            <option value="">Seleccionar…</option>
            {Object.entries(CLIENT_DECISION_CHANNELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="col-md-3">
          <TextField
            label="Número de autorización"
            name="authorization_number"
            maxLength={50}
            value={header.authorization_number}
            onChange={(event) => setField('authorization_number', event.target.value)}
            errors={errors}
          />
        </div>
        <div className="col-md-3">
          <TextField
            label="Perito"
            name="adjuster_name"
            maxLength={150}
            value={header.adjuster_name}
            onChange={(event) => setField('adjuster_name', event.target.value)}
            errors={errors}
          />
        </div>
      </div>

      <FormField
        label="Los importes que informa la aseguradora"
        required
        error={errors.amounts_include_tax}
        hint="Se guardan sin IVA, como el presupuesto: si vienen con IVA, el sistema lo descuenta."
      >
        <div className="form-selectgroup" role="radiogroup" aria-label="Unidad de los importes">
          {[
            { value: true, label: 'Incluyen IVA' },
            { value: false, label: 'No incluyen IVA' },
          ].map((option) => (
            <label key={option.label} className="form-selectgroup-item">
              <input
                type="radio"
                name="amounts_include_tax"
                className="form-selectgroup-input"
                checked={header.amounts_include_tax === option.value}
                onChange={() => setField('amounts_include_tax', option.value)}
              />
              <span className="form-selectgroup-label">{option.label}</span>
            </label>
          ))}
        </div>
      </FormField>

      <div className="table-responsive mb-3">
        <table className="table table-vcenter card-table">
          <thead>
            <tr>
              <th>Línea a cargo de la aseguradora</th>
              <th className="text-end">Presupuestado (sin IVA)</th>
              <th>Decisión</th>
              <th>Importe autorizado</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {insurerItems.map((item, index) => (
              <DecisionRow key={item.id} item={item} row={rows[index]} index={index} errors={errors} onChange={(patch) => setRow(index, patch)} />
            ))}
          </tbody>
        </table>
      </div>

      <FormField
        label="Documentos de respaldo"
        hint="Del siniestro y sin vincular. Obligatorios si esta versión autoriza más que la vigente en alguna línea; quedan vinculados y ya no se dan de baja."
        error={evidenceRequired ? ['Vincule el documento de la aseguradora que respalda el aumento.'] : errors.document_ids}
      >
        {available.length === 0 ? (
          <div className="text-secondary small mb-2">{documents.isLoading ? 'Cargando…' : 'No hay documentos sin vincular.'}</div>
        ) : (
          <div className="mb-2">
            {available.map((document) => (
              <label key={document.id} className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={header.document_ids.includes(document.id)}
                  onChange={() => toggleDocument(document.id)}
                />
                <span className="form-check-label">
                  {document.original_name} <span className="text-secondary small">· {document.type.label}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <InlineUpload claim={claim} onUploaded={(id) => setField('document_ids', [...header.document_ids, id])} />
      </FormField>

      <TextareaField label="Notas" name="notes" rows={2} maxLength={1000} value={header.notes} onChange={(event) => setField('notes', event.target.value)} errors={errors} />
    </FormModal>
  )
}

function DecisionRow({
  item,
  row,
  index,
  errors,
  onChange,
}: {
  item: BudgetItem
  row: AuthorizationRow
  index: number
  errors: ReturnType<typeof validationErrors>
  onChange: (patch: Partial<AuthorizationRow>) => void
}) {
  const error = (field: string) => errors[`items.${index}.${field}`]
  const partial = row.decision === 'partial'

  return (
    <tr>
      <td>
        {item.description}
        <div className="small text-secondary">cant. {formatDecimal(item.quantity)}</div>
      </td>
      <td className="text-end text-nowrap">{formatMoney(item.total)}</td>
      <td>
        <select
          className={`form-select form-select-sm${error('decision') ? ' is-invalid' : ''}`}
          aria-label={`Decisión sobre ${item.description}`}
          value={row.decision}
          onChange={(event) => onChange({ decision: event.target.value as AuthorizationDecision | '' })}
        >
          <option value="">Seleccionar…</option>
          {Object.entries(AUTHORIZATION_DECISIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {error('decision')?.map((message) => (
          <div key={message} className="invalid-feedback d-block">
            {message}
          </div>
        ))}
      </td>
      <td>
        {partial ? (
          <>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className={`form-control form-control-sm${error('authorized_total') ? ' is-invalid' : ''}`}
              aria-label={`Importe autorizado de ${item.description}`}
              value={row.authorized_total}
              onChange={(event) => onChange({ authorized_total: event.target.value })}
            />
            {error('authorized_total')?.map((message) => (
              <div key={message} className="invalid-feedback d-block">
                {message}
              </div>
            ))}
          </>
        ) : (
          <span className="text-secondary small">{row.decision === 'authorized' ? 'Todo lo presupuestado' : row.decision === 'not_covered' ? '0' : '—'}</span>
        )}
      </td>
      <td>
        {partial && (
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className={`form-control form-control-sm${error('authorized_quantity') ? ' is-invalid' : ''}`}
            aria-label={`Cantidad autorizada de ${item.description}`}
            placeholder={formatDecimal(item.quantity)}
            value={row.authorized_quantity}
            onChange={(event) => onChange({ authorized_quantity: event.target.value })}
          />
        )}
      </td>
    </tr>
  )
}

/** Subir un documento del siniestro sin salir del formulario: queda marcado como respaldo. */
function InlineUpload({ claim, onUploaded }: { claim: Claim; onUploaded: (documentId: number) => void }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<ClaimDocumentType>('authorization')
  const [busy, setBusy] = useState(false)

  const upload = async () => {
    if (!file) return toast.error('Elija un archivo.')
    if (file.size > CLAIM_DOCUMENT_MAX_BYTES) return toast.error('El archivo supera los 10 MB.')
    setBusy(true)
    try {
      const document = await claimsApi.upload(claim.id, file, type, '')
      await queryClient.invalidateQueries({ queryKey: ['claims', claim.id, 'documents'] })
      onUploaded(document.id)
      toast.success('Documento subido y marcado como respaldo.')
      setOpen(false)
      setFile(null)
    } catch (error) {
      const fieldErrors = validationErrors(error)
      toast.error(fieldErrors.file?.[0] ?? (error instanceof Error ? error.message : 'No se pudo subir el documento.'))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(true)}>
        <IconUpload size={16} className="me-1" aria-hidden="true" />
        Subir documento
      </button>
    )
  }

  return (
    <div className="d-flex flex-wrap gap-2 align-items-center border rounded p-2">
      <input
        type="file"
        className="form-control form-control-sm w-auto"
        accept={CLAIM_DOCUMENT_ACCEPT}
        aria-label="Archivo de respaldo"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <select className="form-select form-select-sm w-auto" aria-label="Tipo de documento" value={type} onChange={(event) => setType(event.target.value as ClaimDocumentType)}>
        {Object.entries(CLAIM_DOCUMENT_TYPES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => void upload()}>
        {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
        Subir
      </button>
      <button type="button" className="btn btn-sm btn-link link-secondary" disabled={busy} onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </div>
  )
}
