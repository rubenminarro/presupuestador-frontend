import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconPencil, IconPlayerPause, IconPlayerPlay, IconPlus, IconStar, IconTrash } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { FormModal } from '@/components/ui/FormModal'
import { SelectField, SwitchField, TextareaField, TextField } from '@/components/ui/FormField'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { showDeductibleMode } from '@/features/claims/api'
import {
  INSURER_CONTACT_ROLES,
  INSURER_STATUS,
  insurersApi,
  type Insurer,
  type InsurerContact,
  type InsurerContactRole,
} from '@/features/insurers/api'
import { EditInsurerModal } from '@/features/insurers/InsurerFormModals'
import { nullIfEmpty } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

export function InsurerDetailPage() {
  const { id } = useParams()
  const insurerId = Number(id)
  const query = useQuery({
    queryKey: ['insurers', 'detail', insurerId],
    queryFn: () => insurersApi.show(insurerId),
    enabled: Number.isInteger(insurerId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Aseguradoras" title="Aseguradora" />
        <PageBody>
          <div className="card">{query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}</div>
        </PageBody>
      </>
    )
  }

  return <InsurerDetail insurer={query.data} />
}

function InsurerDetail({ insurer }: { insurer: Insurer }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const active = insurer.status.value === 'active'

  const toggleStatus = useApiMutation(() => insurersApi.setStatus(insurer.id, !active), {
    invalidate: [['insurers']],
    successMessage: active ? 'Aseguradora desactivada: no admite siniestros nuevos.' : 'Aseguradora activada.',
  })

  return (
    <>
      <PageHeader
        pretitle={`Aseguradora · ${insurer.code}`}
        title={insurer.client.display_name}
        actions={
          <>
            <Link to="/insurers" className="btn btn-link">
              <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
              Aseguradoras
            </Link>
            {can('insurers.change-status') && (
              <button
                type="button"
                className={`btn btn-outline-${active ? 'warning' : 'success'}`}
                disabled={toggleStatus.isPending}
                onClick={() => toggleStatus.mutate()}
              >
                {active ? <IconPlayerPause size={18} className="me-1" aria-hidden="true" /> : <IconPlayerPlay size={18} className="me-1" aria-hidden="true" />}
                {active ? 'Desactivar' : 'Activar'}
              </button>
            )}
            {can('insurers.update') && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setEditing(true)}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar
              </button>
            )}
            {can('insurers.destroy') && (
              <button type="button" className="btn btn-outline-danger" onClick={() => setDeleting(true)}>
                <IconTrash size={18} className="me-1" aria-hidden="true" />
                Eliminar
              </button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="row row-cards">
          <div className="col-12 col-lg-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Datos</h3>
                <div className="card-actions">
                  <StatusBadge value={insurer.status.value} map={INSURER_STATUS} />
                </div>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-5">Cliente</dt>
                  <dd className="col-7">
                    {can('clients.show') ? <Link to={`/clients/${insurer.client.id}`}>{insurer.client.display_name}</Link> : insurer.client.display_name}
                  </dd>
                  <dt className="col-5">RUC</dt>
                  <dd className="col-7">{insurer.client.document_number}</dd>
                  <dt className="col-5">Teléfono</dt>
                  <dd className="col-7">{insurer.client.phone}</dd>
                  <dt className="col-5">Email</dt>
                  <dd className="col-7 text-break">{insurer.client.email}</dd>
                  <dt className="col-5">Plazo de pago</dt>
                  <dd className="col-7">{insurer.payment_term_days === null ? '30 días (predeterminado)' : `${insurer.payment_term_days} días`}</dd>
                  {showDeductibleMode(insurer.deductible_net_mode_available, insurer.deductible_billing_mode?.value) && (
                    <>
                      <dt className="col-5">Deducible</dt>
                      <dd className="col-7">{insurer.deductible_billing_mode?.label ?? 'Sin modalidad (con deducible no se factura)'}</dd>
                    </>
                  )}
                  <dt className="col-12">Notas</dt>
                  <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                    {insurer.notes ?? <span className="text-secondary">Sin notas.</span>}
                  </dd>
                </dl>
                <div className="small text-secondary mt-3">Razón social, RUC, teléfono y email se editan en la ficha del cliente.</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-8">
            <ContactsCard insurer={insurer} />
          </div>
        </div>
      </PageBody>
      {editing && <EditInsurerModal insurer={insurer} onClose={() => setEditing(false)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar aseguradora"
          message={
            <>
              ¿Eliminar <strong>{insurer.client.display_name}</strong>? Con siniestros (también cancelados) no se elimina: desactívela. El
              cliente empresa queda como está.
            </>
          }
          onDelete={() => insurersApi.remove(insurer.id)}
          invalidate={[['insurers']]}
          successMessage="Aseguradora eliminada."
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate('/insurers')}
        />
      )}
    </>
  )
}

function ContactsCard({ insurer }: { insurer: Insurer }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<InsurerContact | 'new' | null>(null)
  const [deleting, setDeleting] = useState<InsurerContact | null>(null)
  const canEdit = can('insurers.update')

  const columns: Column<InsurerContact>[] = [
    {
      key: 'name',
      header: 'Contacto',
      render: (contact) => (
        <>
          {contact.name}
          {contact.is_primary && (
            <span className="badge bg-yellow-lt ms-2">
              <IconStar size={12} className="me-1" aria-hidden="true" />
              Principal
            </span>
          )}
          {contact.notes && <div className="small text-secondary">{contact.notes}</div>}
        </>
      ),
    },
    { key: 'role', header: 'Rol', render: (contact) => contact.role.label },
    { key: 'phone', header: 'Teléfono', className: 'text-nowrap', render: (contact) => contact.phone ?? '—' },
    { key: 'email', header: 'Email', render: (contact) => contact.email ?? '—' },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: <span className="visually-hidden">Acciones</span>,
            className: 'w-1 text-nowrap',
            render: (contact: InsurerContact) => (
              <>
                <IconButton label={`Editar ${contact.name}`} icon={IconPencil} onClick={() => setEditing(contact)} />
                <IconButton label={`Eliminar ${contact.name}`} icon={IconTrash} variant="danger" onClick={() => setDeleting(contact)} />
              </>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <DataTable
        title="Contactos"
        columns={columns}
        rows={insurer.contacts}
        rowKey={(contact) => contact.id}
        emptyMessage="Sin contactos cargados."
        toolbar={
          canEdit && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={16} className="me-1" aria-hidden="true" />
              Agregar contacto
            </button>
          )
        }
      />
      {editing && <ContactModal insurer={insurer} contact={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteDialog
          title="Eliminar contacto"
          message={
            <>
              ¿Eliminar a <strong>{deleting.name}</strong>?
            </>
          }
          onDelete={() => insurersApi.removeContact(insurer.id, deleting.id)}
          invalidate={[['insurers']]}
          successMessage="Contacto eliminado."
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}

function ContactModal({ insurer, contact, onClose }: { insurer: Insurer; contact: InsurerContact | null; onClose: () => void }) {
  const [name, setName] = useState(contact?.name ?? '')
  const [role, setRole] = useState<InsurerContactRole | ''>(contact?.role.value ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [isPrimary, setIsPrimary] = useState(contact?.is_primary ?? insurer.contacts.length === 0)
  const [notes, setNotes] = useState(contact?.notes ?? '')

  const mutation = useApiMutation(
    () => {
      const body = { name: name.trim(), role, phone: nullIfEmpty(phone), email: nullIfEmpty(email)?.toLowerCase() ?? null, is_primary: isPrimary, notes: nullIfEmpty(notes) }
      return contact ? insurersApi.updateContact(insurer.id, contact.id, body) : insurersApi.createContact(insurer.id, body)
    },
    { invalidate: [['insurers']], successMessage: contact ? 'Contacto actualizado.' : 'Contacto agregado.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={contact ? 'Editar contacto' : 'Nuevo contacto'} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      <TextField label="Nombre" name="name" required autoFocus maxLength={150} value={name} onChange={(event) => setName(event.target.value)} errors={errors} />
      <SelectField label="Rol" name="role" required value={role} onChange={(event) => setRole(event.target.value as InsurerContactRole | '')} errors={errors}>
        <option value="">Seleccionar…</option>
        {Object.entries(INSURER_CONTACT_ROLES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <div className="row">
        <div className="col-md-6">
          <TextField label="Teléfono" name="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} errors={errors} />
        </div>
        <div className="col-md-6">
          <TextField label="Email" name="email" type="email" maxLength={100} value={email} onChange={(event) => setEmail(event.target.value)} errors={errors} />
        </div>
      </div>
      <SwitchField
        label="Contacto principal"
        name="is_primary"
        checked={isPrimary}
        onChange={setIsPrimary}
        errors={errors}
        hint="Hay uno solo: marcar este desmarca al anterior."
      />
      <TextareaField label="Notas" name="notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} errors={errors} />
    </FormModal>
  )
}
