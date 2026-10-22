import { useState } from 'react'
import { IconFileDownload } from '@tabler/icons-react'
import { toast } from '@/lib/toast'

interface DownloadButtonProps {
  label: string
  /** Descarga con `downloadFile` (los errores llegan como `ApiError` con el mensaje del backend). */
  onDownload: () => Promise<void>
  className?: string
}

/** Botón que descarga un archivo (PDF/CSV) y muestra el progreso; si falla, el error va a un toast. */
export function DownloadButton({ label, onDownload, className = 'btn btn-outline-secondary' }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const download = async () => {
    setDownloading(true)
    try {
      await onDownload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo descargar el archivo.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button type="button" className={className} disabled={downloading} onClick={() => void download()}>
      {downloading ? (
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      ) : (
        <IconFileDownload size={18} className="me-1" aria-hidden="true" />
      )}
      {label}
    </button>
  )
}
