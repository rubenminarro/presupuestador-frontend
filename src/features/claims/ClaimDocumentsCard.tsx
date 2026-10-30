import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconFileDownload, IconTrash, IconUpload } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FormField, SelectField, TextareaField } from '@/components/ui/FormField'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/features/auth/useAuth'
import {
  CLAIM_DOCUMENT_ACCEPT,
  CLAIM_DOCUMENT_MAX_BYTES,
  CLAIM_DOCUMENT_TYPES,
  claimsApi,
  type Claim,
  type ClaimDocument,
  type ClaimDocumentType,
} from '@/features/claims/api'
import { formatDateTime } from '@/lib/format'
import { toast } from '@/lib/toast'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

function fileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

/**
 * Documentos privados del siniestro (M4): se descargan solo por la API (cada descarga queda en la auditoría). Se suben
 * con el siniestro abierto o cerrado; la baja (con motivo) es solo del administrador y no aplica a la evidencia de una
 * autorización.
 */
export function ClaimDocumentsCard({ claim }: { claim: Claim }) {
  const { can } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<ClaimDocument | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const query = useQuery({
    queryKey: ['claims', claim.id, 'documents'],
    queryFn: () => claimsApi.documents(claim.id),
    enabled: can('claim-documents.index'),
  })
  const remove = useApiMutation((reason: string) => claimsApi.removeDocument(claim.id, (deleting as ClaimDocument).id, reason), {
    invalidate: [['claims', claim.id, 'documents']],
    successMessage: 'Documento dado de baja. El archivo se conserva.',
    onSuccess: () => setDeleting(null),
  })

  if (!can('claim-documents.index')) return null

  const download = async (document: ClaimDocument) => {
    setDownloadingId(document.id)
    try {
      await claimsApi.download(claim.id, document)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo descargar el documento.')
    } finally {
      setDownloadingId(null)
    }
  }

  const columns: Column<ClaimDocument>[] = [
    {
      key: 'name',
      header: 'Documento',
      render: (document) => (
        <>
          <div className="text-break">{document.original_name}</div>
          <div className="small text-secondary">
            {document.type.label} · {fileSize(document.size)}
            {document.insurer_authorization_id !== null && ' · respalda una autorización'}
          </div>
          {document.notes && <div className="small text-secondary">{document.notes}</div>}
        </>
      ),
    },
    {
      key: 'uploaded',
      header: 'Subido',
      className: 'text-nowrap',
      render: (document) => (
        <>
          {formatDateTime(document.created_at)}
          {document.uploaded_by && <div className="small text-secondary">{document.uploaded_by.name}</div>}
        </>
      ),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Acciones</span>,
      className: 'w-1 text-nowrap',
      render: (document) => (
        <>
          {can('claim-documents.download') && (
            <IconButton
              label={`Descargar ${document.original_name}`}
              icon={IconFileDownload}
              disabled={downloadingId === document.id}
              onClick={() => void download(document)}
            />
          )}
          {can('claim-documents.destroy') && document.insurer_authorization_id === null && (
            <IconButton label={`Dar de baja ${document.original_name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(document)} />
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <DataTable
        title="Documentos"
        columns={columns}
        rows={query.data}
        rowKey={(document) => document.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="Sin documentos."
        toolbar={
          can('claim-documents.store') &&
          claim.status.value !== 'cancelled' && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setUploading(true)}>
              <IconUpload size={16} className="me-1" aria-hidden="true" />
              Subir documento
            </button>
          )
        }
      />
      {uploading && <UploadModal claim={claim} onClose={() => setUploading(false)} />}
      <ConfirmDialog
        open={deleting !== null}
        title="Dar de baja el documento"
        message={
          <>
            ¿Dar de baja <strong>{deleting?.original_name}</strong>? Deja de listarse y de poder descargarse; el archivo se conserva.
          </>
        }
        confirmLabel="Dar de baja"
        variant="danger"
        reason={{ label: 'Motivo', field: 'reason' }}
        isLoading={remove.isPending}
        error={remove.error}
        onConfirm={(reason) => remove.mutate(reason ?? '')}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

function UploadModal({ claim, onClose }: { claim: Claim; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<ClaimDocumentType | ''>('')
  const [notes, setNotes] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const mutation = useApiMutation(() => claimsApi.upload(claim.id, file as File, type as ClaimDocumentType, notes), {
    invalidate: [['claims', claim.id, 'documents']],
    successMessage: 'Documento subido.',
    onSuccess: onClose,
  })
  const errors = validationErrors(mutation.error)

  const submit = () => {
    // Ayuda de UX: el backend valida tipo real, extensión y tamaño.
    if (!file) return setLocalError('Elija un archivo.')
    if (file.size > CLAIM_DOCUMENT_MAX_BYTES) return setLocalError('El archivo supera los 10 MB.')
    setLocalError(null)
    mutation.mutate()
  }

  return (
    <FormModal title={`Subir documento · ${claim.code}`} onClose={onClose} onSubmit={submit} isSubmitting={mutation.isPending} submitLabel="Subir">
      <FormField label="Archivo" required hint="PDF, JPG, PNG o WEBP, hasta 10 MB." error={localError ? [localError] : errors?.file}>
        <input
          type="file"
          name="file"
          className="form-control"
          accept={CLAIM_DOCUMENT_ACCEPT}
          aria-label="Archivo"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </FormField>
      <SelectField label="Tipo" name="type" required value={type} onChange={(event) => setType(event.target.value as ClaimDocumentType | '')} errors={errors}>
        <option value="">Seleccionar…</option>
        {Object.entries(CLAIM_DOCUMENT_TYPES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <TextareaField label="Notas" name="notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}
