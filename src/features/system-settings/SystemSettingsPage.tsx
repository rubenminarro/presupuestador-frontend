import { useRef, useState, type ChangeEvent } from 'react'
import { IconPhoto, IconTrash, IconUpload } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { BRANDING_KEY, LOGO_ACCEPT, LOGO_MAX_BYTES, systemSettingsApi } from '@/features/system-settings/api'
import { useBranding } from '@/features/system-settings/useBranding'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/** Configuración general del sistema (solo administrador): por ahora, el logo. */
export function SystemSettingsPage() {
  return (
    <>
      <PageHeader pretitle="Administración" title="Configuración del sistema" />
      <PageBody>
        <div className="row row-cards">
          <div className="col-lg-8">
            <LogoCard />
          </div>
        </div>
      </PageBody>
    </>
  )
}

function LogoCard() {
  const { logo_url: logoUrl, logo_black_url: logoBlackUrl } = useBranding()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const upload = useApiMutation(systemSettingsApi.uploadLogo, {
    invalidate: [BRANDING_KEY],
    successMessage: 'Logo actualizado.',
  })
  const remove = useApiMutation(systemSettingsApi.deleteLogo, {
    invalidate: [BRANDING_KEY],
    successMessage: 'Logo eliminado.',
    onSuccess: () => setConfirmDelete(false),
  })

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    // Solo ayuda de UX: el backend vuelve a validar formato y tamaño.
    if (!LOGO_ACCEPT.split(',').includes(file.type)) {
      setLocalError('El logo debe ser una imagen PNG o JPG.')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLocalError('El logo no debe superar los 2 MB.')
      return
    }
    setLocalError(null)
    upload.mutate(file)
  }

  const error = localError ?? validationErrors(upload.error).logo?.[0] ?? null

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Logo del sistema</h3>
      </div>
      <div className="card-body">
        <p className="text-secondary">
          Reemplaza al nombre en el inicio de sesión, la barra de menú y el ícono de la pestaña, y encabeza los PDF
          (presupuestos, facturas, recibos, entregas y reportes) y los emails a clientes. Sobre fondos claros, en los PDF
          y en los emails se usa la versión negra.
        </p>
        <div className="row g-3 align-items-center">
          <div className="col-sm-auto">
            <div className="d-flex gap-2">
              <LogoPreview url={logoBlackUrl} theme="light" />
              <LogoPreview url={logoUrl} theme="dark" />
            </div>
          </div>
          <div className="col">
            <div className="btn-list">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => inputRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                ) : (
                  <IconUpload size={16} className="me-2" aria-hidden="true" />
                )}
                {logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {logoUrl && (
                <button type="button" className="btn btn-outline-danger" onClick={() => setConfirmDelete(true)}>
                  <IconTrash size={16} className="me-2" aria-hidden="true" />
                  Quitar logo
                </button>
              )}
            </div>
            <input ref={inputRef} type="file" accept={LOGO_ACCEPT} className="d-none" onChange={handleFile} aria-label="Archivo del logo" />
            {error && <div className="invalid-feedback d-block">{error}</div>}
            <small className="form-hint mt-2">
              PNG o JPG de hasta 2 MB. Con un PNG de fondo transparente se recortan los márgenes sobrantes y se genera la
              versión negra; un JPG o un PNG sin transparencia se usa tal cual en todos lados. Se recomienda un logo
              horizontal claro, para la barra de menú oscura.
            </small>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Quitar logo"
        message="Sin logo, cada lugar vuelve a mostrar el nombre del sistema."
        confirmLabel="Quitar"
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate()}
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
