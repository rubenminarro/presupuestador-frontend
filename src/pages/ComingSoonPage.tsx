import { PageBody, PageHeader } from '@/components/ui/Page'
import { EmptyState } from '@/components/ui/States'

/** Pantalla provisoria de los módulos que todavía no se construyeron. */
export function ComingSoonPage({ title, phase }: { title: string; phase?: string }) {
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <div className="card">
          <EmptyState
            title="Módulo en construcción"
            message={phase ? `Se implementa en la fase ${phase} del plan de desarrollo.` : undefined}
          />
        </div>
      </PageBody>
    </>
  )
}
