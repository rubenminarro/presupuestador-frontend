import { useId, useState } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { IconPencil, IconTrash, IconUpload } from '@tabler/icons-react'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { EmptyState } from '@/components/ui/States'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/FormField'
import { nullIfEmpty } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

export interface GalleryPhoto {
  id: number
  url: string | null
  original_name: string
  description: string | null
}

interface PhotoGalleryProps {
  photos: GalleryPhoto[]
  /** Consultas a refrescar después de subir, editar o eliminar. */
  invalidate: QueryKey[]
  onUpload?: (files: File[], description: string | null) => Promise<unknown>
  onUpdate?: (photo: GalleryPhoto, description: string | null) => Promise<unknown>
  onDelete?: (photo: GalleryPhoto) => Promise<unknown>
  /** El backend no permite vaciar la descripción (fotos de diagnóstico). */
  descriptionRequired?: boolean
  emptyMessage?: string
}

/** Fotos en grilla: subir (jpg, png o webp, hasta 5 MB c/u), editar la descripción y eliminar, según las acciones dadas. */
export function PhotoGallery({
  photos,
  invalidate,
  onUpload,
  onUpdate,
  onDelete,
  descriptionRequired,
  emptyMessage = 'No hay fotos cargadas.',
}: PhotoGalleryProps) {
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState<GalleryPhoto | null>(null)
  const [deleting, setDeleting] = useState<GalleryPhoto | null>(null)

  return (
    <>
      {onUpload && (
        <div className="mb-3">
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setUploading(true)}>
            <IconUpload size={16} className="me-1" aria-hidden="true" />
            Subir fotos
          </button>
        </div>
      )}
      {photos.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="row g-2">
          {photos.map((photo) => (
            <div key={photo.id} className="col-6 col-md-4 col-xl-3">
              <div className="card card-sm h-100">
                {photo.url ? (
                  <a href={photo.url} target="_blank" rel="noreferrer" className="d-block">
                    <img
                      src={photo.url}
                      alt={photo.description ?? photo.original_name}
                      className="card-img-top"
                      style={{ aspectRatio: '4 / 3', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div className="card-img-top bg-secondary-lt" style={{ aspectRatio: '4 / 3' }} />
                )}
                <div className="card-body d-flex align-items-start gap-1">
                  <div className="flex-fill small text-break">{photo.description ?? <span className="text-secondary">Sin descripción</span>}</div>
                  {onUpdate && <IconButton label="Editar descripción" icon={IconPencil} onClick={() => setEditing(photo)} />}
                  {onDelete && <IconButton label="Eliminar foto" icon={IconTrash} variant="danger" onClick={() => setDeleting(photo)} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && onUpload && <UploadModal onUpload={onUpload} invalidate={invalidate} onClose={() => setUploading(false)} />}
      {editing && onUpdate && (
        <DescriptionModal
          photo={editing}
          required={descriptionRequired}
          onSave={(description) => onUpdate(editing, description)}
          invalidate={invalidate}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && onDelete && (
        <DeleteDialog
          title="Eliminar foto"
          message="¿Eliminar la foto? El archivo se borra del servidor."
          onDelete={() => onDelete(deleting)}
          invalidate={invalidate}
          successMessage="Foto eliminada."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function UploadModal({
  onUpload,
  invalidate,
  onClose,
}: {
  onUpload: (files: File[], description: string | null) => Promise<unknown>
  invalidate: QueryKey[]
  onClose: () => void
}) {
  const inputId = useId()
  const [files, setFiles] = useState<File[]>([])
  const [description, setDescription] = useState('')

  const mutation = useApiMutation(() => onUpload(files, nullIfEmpty(description)), {
    invalidate,
    successMessage: files.length === 1 ? 'Foto subida.' : 'Fotos subidas.',
    onSuccess: onClose,
  })
  // Los errores llegan por foto (`photos.0.file`); se muestran todos juntos.
  const errors = Object.entries(validationErrors(mutation.error)).flatMap(([, messages]) => messages)

  return (
    <FormModal title="Subir fotos" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Subir">
      <div className="mb-3">
        <label className="form-label required" htmlFor={inputId}>
          Fotos
        </label>
        <input
          id={inputId}
          type="file"
          className="form-control"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <small className="form-hint">JPG, PNG o WEBP, hasta 5 MB cada una.</small>
      </div>
      <TextField
        label="Descripción"
        name="description"
        maxLength={255}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        hint="Opcional; se aplica a todas las fotos de esta carga."
      />
      {[...new Set(errors)].map((message) => (
        <div key={message} className="invalid-feedback d-block">
          {message}
        </div>
      ))}
    </FormModal>
  )
}

function DescriptionModal({
  photo,
  required,
  onSave,
  invalidate,
  onClose,
}: {
  photo: GalleryPhoto
  required?: boolean
  onSave: (description: string | null) => Promise<unknown>
  invalidate: QueryKey[]
  onClose: () => void
}) {
  const [description, setDescription] = useState(photo.description ?? '')
  const mutation = useApiMutation(() => onSave(nullIfEmpty(description)), {
    invalidate,
    successMessage: 'Descripción actualizada.',
    onSuccess: onClose,
  })

  return (
    <FormModal title="Descripción de la foto" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} size="sm">
      <TextField
        label="Descripción"
        name="description"
        required={required}
        autoFocus
        maxLength={255}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        errors={validationErrors(mutation.error)}
      />
    </FormModal>
  )
}
