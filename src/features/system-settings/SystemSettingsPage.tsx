import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { IconPhoto, IconTrash, IconUpload } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageBody, PageHeader } from '@/components/ui/Page'
import {
  BRANDING_KEY,
  FAVICON_ACCEPT,
  FAVICON_EXTENSIONS,
  FAVICON_MAX_BYTES,
  LOGO_ACCEPT,
  LOGO_MAX_BYTES,
  systemSettingsApi,
  type Branding,
} from '@/features/system-settings/api'
import { useBranding } from '@/features/system-settings/useBranding'
import { WorkshopSettingsCard } from '@/features/system-settings/WorkshopSettingsCard'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/** Configuración general del sistema (solo administrador): los datos del taller, el logo y el ícono de la pestaña. */
export function SystemSettingsPage() {
  const branding = useBranding()

  return (
    <>
      <PageHeader pretitle="Administración" title="Configuración del sistema" />
      <PageBody>
        <div className="row row-cards">
          <div className="col-lg-8">
            <WorkshopSettingsCard />
          </div>
          <div className="col-lg-8">
            <ImageCard
              title="Logo del sistema"
              description="Reemplaza al nombre en el inicio de sesión y la barra de menú, y encabeza los PDF (presupuestos, facturas, recibos, entregas y reportes) y los emails a clientes. Sobre fondos claros, en los PDF y en los emails se usa la versión negra."
              hint="PNG o JPG de hasta 2 MB. Con un PNG de fondo transparente se recortan los márgenes sobrantes y se genera la versión negra; un JPG o un PNG sin transparencia se usa tal cual en todos lados. Se recomienda un logo horizontal claro, para la barra de menú oscura."
              current={branding.logo_url}
              noun="logo"
              field="logo"
              accept={LOGO_ACCEPT}
              check={(file) => {
                if (!LOGO_ACCEPT.split(',').includes(file.type)) return 'El logo debe ser una imagen PNG o JPG.'
                if (file.size > LOGO_MAX_BYTES) return 'El logo no debe superar los 2 MB.'
                return null
              }}
              upload={systemSettingsApi.uploadLogo}
              remove={systemSettingsApi.deleteLogo}
              removeMessage="Sin logo, cada lugar vuelve a mostrar el nombre del sistema."
              preview={
                <div className="d-flex gap-2">
                  <LogoPreview url={branding.logo_black_url} theme="light" />
                  <LogoPreview url={branding.logo_url} theme="dark" />
                </div>
              }
            />
          </div>
          <div className="col-lg-8">
            <ImageCard
              title="Ícono de la pestaña (favicon)"
              description="El ícono que muestra el navegador en la pestaña, los favoritos y el historial. Es independiente del logo: a ese tamaño conviene un dibujo simple, como el isotipo o una inicial."
              hint="PNG o ICO cuadrado (de 16 a 1024 px de lado; se recomienda 512 × 512) o SVG, de hasta 512 KB. Que se lea sobre pestañas claras y oscuras. Sin favicon se usa el ícono original de la aplicación."
              current={branding.favicon_url}
              noun="favicon"
              field="favicon"
              accept={FAVICON_ACCEPT}
              check={(file) => {
                const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
                if (!FAVICON_EXTENSIONS.includes(extension)) return 'El favicon debe ser una imagen PNG, ICO o SVG.'
                if (file.size > FAVICON_MAX_BYTES) return 'El favicon no debe superar los 512 KB.'
                return null
              }}
              upload={systemSettingsApi.uploadFavicon}
              remove={systemSettingsApi.deleteFavicon}
              removeMessage="La pestaña vuelve a mostrar el ícono original de la aplicación."
              preview={<FaviconPreview url={branding.favicon_url} />}
            />
          </div>
        </div>
      </PageBody>
    </>
  )
}

interface ImageCardProps {
  title: string
  description: string
  hint: string
  /** URL del archivo cargado (decide entre "Subir" y "Cambiar" y si se puede quitar). */
  current: string | null
  noun: string
  /** Campo del 422 en la API. */
  field: string
  accept: string
  /** Solo ayuda de UX: el backend vuelve a validar formato, tamaño y contenido. */
  check: (file: File) => string | null
  upload: (file: File) => Promise<Branding>
  remove: () => Promise<Branding>
  removeMessage: string
  preview: ReactNode
}

function ImageCard({ title, description, hint, current, noun, field, accept, check, upload, remove, removeMessage, preview }: ImageCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const uploadMutation = useApiMutation(upload, { invalidate: [BRANDING_KEY], successMessage: `Se actualizó el ${noun}.` })
  const removeMutation = useApiMutation(remove, {
    invalidate: [BRANDING_KEY],
    successMessage: `Se quitó el ${noun}.`,
    onSuccess: () => setConfirmDelete(false),
  })

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const problem = check(file)
    setLocalError(problem)
    if (!problem) uploadMutation.mutate(file)
  }

  const error = localError ?? validationErrors(uploadMutation.error)[field]?.[0] ?? null

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-body">
        <p className="text-secondary">{description}</p>
        <div className="row g-3 align-items-center">
          <div className="col-sm-auto">{preview}</div>
          <div className="col">
            <div className="btn-list">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => inputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                ) : (
                  <IconUpload size={16} className="me-2" aria-hidden="true" />
                )}
                {current ? `Cambiar ${noun}` : `Subir ${noun}`}
              </button>
              {current && (
                <button type="button" className="btn btn-outline-danger" onClick={() => setConfirmDelete(true)}>
                  <IconTrash size={16} className="me-2" aria-hidden="true" />
                  Quitar {noun}
                </button>
              )}
            </div>
            <input ref={inputRef} type="file" accept={accept} className="d-none" onChange={handleFile} aria-label={`Archivo del ${noun}`} />
            {error && <div className="invalid-feedback d-block">{error}</div>}
            <small className="form-hint mt-2">{hint}</small>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={`Quitar ${noun}`}
        message={removeMessage}
        confirmLabel="Quitar"
        variant="danger"
        isLoading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function LogoPreview({ url, theme }: { url: string | null; theme: 'light' | 'dark' }) {
  return (
    <div
      data-bs-theme={theme}
      className="d-flex align-items-center justify-content-center border rounded bg-body text-secondary"
      style={{ width: 160, height: 80 }}
      title={theme === 'light' ? 'Sobre fondo claro, PDF y emails' : 'Sobre fondo oscuro'}
    >
      {url ? (
        <img src={url} alt="Logo del sistema" style={{ maxWidth: 140, maxHeight: 60 }} />
      ) : (
        <IconPhoto size={32} stroke={1.5} aria-label="Sin logo" />
      )}
    </div>
  )
}

/** El favicon a los tamaños reales de la pestaña (16 y 32 px), sobre una pestaña clara y una oscura. */
function FaviconPreview({ url }: { url: string | null }) {
  const src = url ?? '/favicon.svg'

  return (
    <div className="d-flex gap-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div
          key={theme}
          data-bs-theme={theme}
          className="d-flex align-items-center justify-content-center gap-3 border rounded bg-body"
          style={{ width: 120, height: 80 }}
          title={theme === 'light' ? 'Pestaña clara' : 'Pestaña oscura'}
        >
          <img src={src} alt={url ? 'Favicon a 16 px' : 'Ícono original a 16 px'} width={16} height={16} />
          <img src={src} alt={url ? 'Favicon a 32 px' : 'Ícono original a 32 px'} width={32} height={32} />
        </div>
      ))}
    </div>
  )
}
