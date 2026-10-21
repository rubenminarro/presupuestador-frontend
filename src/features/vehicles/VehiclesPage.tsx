import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPlus } from '@tabler/icons-react'
import { DataTable } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { useAuth } from '@/features/auth/useAuth'
import { vehiclesApi, type Vehicle } from '@/features/vehicles/api'
import { DeleteVehicleDialog } from '@/features/vehicles/DeleteVehicleDialog'
import { vehicleColumns } from '@/features/vehicles/vehicleColumns'
import { VehicleFormModal } from '@/features/vehicles/VehicleFormModal'
import { useListParams } from '@/lib/useListParams'

export function VehiclesPage() {
  const { can } = useAuth()
  const list = useListParams()
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)

  const query = useQuery({
    queryKey: ['vehicles', list.params],
    queryFn: () => vehiclesApi.list(list.params),
    placeholderData: keepPreviousData,
  })

  const columns = vehicleColumns({
    showClient: true,
    canOpenClient: can('clients.show'),
    onEdit: can('vehicles.update') ? setEditing : undefined,
    onDelete: can('vehicles.destroy') ? setDeleting : undefined,
  })

  return (
    <>
      <PageHeader
        pretitle="Clientes"
        title="Vehículos"
        actions={
          can('vehicles.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo vehículo
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(vehicle) => vehicle.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Chapa, chasis, marca, modelo o cliente…' }}
        />
      </PageBody>
      {editing && <VehicleFormModal vehicle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteVehicleDialog vehicle={deleting} onClose={() => setDeleting(null)} />}
    </>
  )
}
