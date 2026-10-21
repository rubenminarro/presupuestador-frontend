import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { partsApi, type Part } from '@/features/parts/api'

/** Baja de repuesto; con stock el backend responde `PART_HAS_STOCK` (toast). */
export function DeletePartDialog({ part, onClose, onDeleted }: { part: Part; onClose: () => void; onDeleted?: () => void }) {
  return (
    <DeleteDialog
      title="Eliminar repuesto"
      message={
        <>
          ¿Eliminar <strong>{part.name}</strong> ({part.code})? Solo se puede si no tiene stock; si ya no se usa, puede desactivarlo o
          descontinuarlo.
        </>
      }
      onDelete={() => partsApi.remove(part.id)}
      invalidate={[['parts'], ['inventory'], ['part-categories']]}
      successMessage="Repuesto eliminado."
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
}
