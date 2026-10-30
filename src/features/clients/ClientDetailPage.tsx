import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { DataTable } from '@/components/ui/DataTable'
import { DeleteDialog } from '@/components/ui/DeleteDialog'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { ErrorState, LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/useAuth'
import { clientsApi, type Client } from '@/features/clients/api'
import { ClientFormModal } from '@/features/clients/ClientFormModal'
import { ClientNotificationsCard } from '@/features/notifications/ClientNotificationsCard'
import type { Vehicle } from '@/features/vehicles/api'
import { VehicleFormModal } from '@/features/vehicles/VehicleFormModal'
import { DeleteVehicleDialog } from '@/features/vehicles/DeleteVehicleDialog'
import { vehicleColumns } from '@/features/vehicles/vehicleColumns'
import { formatDate } from '@/lib/format'

export function ClientDetailPage() {
  const { id } = useParams()
  const clientId = Number(id)

  const query = useQuery({
    queryKey: ['clients', 'detail', clientId],
    queryFn: () => clientsApi.show(clientId),
    enabled: Number.isInteger(clientId),
  })

  if (!query.data) {
    return (
      <>
        <PageHeader pretitle="Clientes" title="Cliente" />
        <PageBody>
          <div className="card">
            {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LoadingState />}
          </div>
        </PageBody>
      </>
    )
  }

  return <ClientDetail client={query.data} />
}

function ClientDetail({ client }: { client: Client }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [editingClient, setEditingClient] = useState(false)
  const [deletingClient, setDeletingClient] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | 'new' | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)

  const columns = vehicleColumns({
    showClient: false,
    onEdit: can('vehicles.update') ? setEditingVehicle : undefined,
    onDelete: can('vehicles.destroy') ? setDeletingVehicle : undefined,
  })

  // Los vehículos del detalle no traen el cliente; el formulario de edición lo necesita.
  const withOwner = (vehicle: Vehicle): Vehicle => ({
    ...vehicle,
    client: {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      document_number: client.document_number,
      phone: client.phone,
      email: client.email,
      full_name: client.display_name,
    },
  })

  return (
    <>
      <PageHeader
        pretitle="Cliente"
        title={client.display_name}
        actions={
          <>
            <Link to="/clients" className="btn btn-link">
              <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
              Clientes
            </Link>
            {can('clients.update') && (
              <button type="button" className="btn btn-outline-primary" onClick={() => setEditingClient(true)}>
                <IconPencil size={18} className="me-1" aria-hidden="true" />
                Editar
              </button>
            )}
            {can('clients.destroy') && (
              <button type="button" className="btn btn-outline-danger" onClick={() => setDeletingClient(true)}>
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
                <h3 className="card-title">Datos del cliente</h3>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-5">Tipo</dt>
                  <dd className="col-7">{client.kind.label}</dd>
                  <dt className="col-5">{client.kind.value === 'company' ? 'RUC' : 'RUC / CI'}</dt>
                  <dd className="col-7">{client.document_number}</dd>
                  <dt className="col-5">Teléfono</dt>
                  <dd className="col-7">{client.phone}</dd>
                  <dt className="col-5">Email</dt>
                  <dd className="col-7 text-break">{client.email}</dd>
                  <dt className="col-5">Dirección</dt>
                  <dd className="col-7">{client.address ?? '—'}</dd>
                  <dt className="col-5">Avisos</dt>
                  <dd className="col-7">
                    {client.notifications_enabled ? (
                      <span className="badge bg-green-lt">Activos</span>
                    ) : (
                      <span className="badge bg-secondary-lt">Desactivados</span>
                    )}
                  </dd>
                  <dt className="col-5">Alta</dt>
                  <dd className="col-7">{formatDate(client.created_at)}</dd>
                  {client.notes && (
                    <>
                      <dt className="col-12">Notas</dt>
                      <dd className="col-12 mb-0" style={{ whiteSpace: 'pre-line' }}>
                        {client.notes}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-8">
            <DataTable
              title="Vehículos"
              columns={columns}
              rows={client.vehicles.map(withOwner)}
              rowKey={(vehicle) => vehicle.id}
              emptyMessage="El cliente no tiene vehículos registrados."
              onRowClick={can('vehicle-history.view') ? (vehicle) => navigate(`/vehicles/${vehicle.id}`) : undefined}
              toolbar={
                can('vehicles.store') && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditingVehicle('new')}>
                    <IconPlus size={16} className="me-1" aria-hidden="true" />
                    Agregar vehículo
                  </button>
                )
              }
            />
          </div>
          {can('client-notifications.index') && (
            <div className="col-12">
              <ClientNotificationsCard clientId={client.id} enabled={client.notifications_enabled} />
            </div>
          )}
        </div>
      </PageBody>

      {editingClient && <ClientFormModal client={client} onClose={() => setEditingClient(false)} />}
      {deletingClient && (
        <DeleteDialog
          title="Eliminar cliente"
          message={
            <>
              ¿Eliminar a <strong>{client.display_name}</strong>? Su documento y email quedan libres para otro registro.
            </>
          }
          onDelete={() => clientsApi.remove(client.id)}
          invalidate={[['clients'], ['vehicles']]}
          successMessage="Cliente eliminado."
          onClose={() => setDeletingClient(false)}
          onDeleted={() => navigate('/clients', { replace: true })}
        />
      )}
      {editingVehicle && (
        <VehicleFormModal
          vehicle={editingVehicle === 'new' ? null : editingVehicle}
          fixedClient={editingVehicle === 'new' ? { id: client.id, name: client.display_name } : undefined}
          onClose={() => setEditingVehicle(null)}
        />
      )}
      {deletingVehicle && <DeleteVehicleDialog vehicle={deletingVehicle} onClose={() => setDeletingVehicle(null)} />}
    </>
  )
}
