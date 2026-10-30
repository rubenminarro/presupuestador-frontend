import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { IconPlus } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { useAuth } from '@/features/auth/useAuth'
import { clientsApi, type ClientSummary } from '@/features/clients/api'
import { ClientFormModal } from '@/features/clients/ClientFormModal'
import { useCreateParam } from '@/lib/useCreateParam'
import { useListParams } from '@/lib/useListParams'

export function ClientsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const list = useListParams()
  const [creating, setCreating] = useCreateParam(can('clients.store'))

  const query = useQuery({
    queryKey: ['clients', list.params],
    queryFn: () => clientsApi.list(list.params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<ClientSummary>[] = [
    { key: 'name', header: 'Cliente', render: (client) => <strong>{client.display_name}</strong> },
    { key: 'document', header: 'RUC / CI', className: 'text-nowrap', render: (client) => client.document_number },
    { key: 'phone', header: 'Teléfono', className: 'text-nowrap', render: (client) => client.phone },
    { key: 'email', header: 'Email', render: (client) => client.email },
    {
      key: 'notifications',
      header: 'Avisos',
      render: (client) =>
        client.notifications_enabled ? (
          <span className="badge bg-green-lt">Activos</span>
        ) : (
          <span className="badge bg-secondary-lt">Desactivados</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        pretitle="Clientes"
        title="Clientes"
        actions={
          can('clients.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo cliente
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(client) => client.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          pagination={query.data?.pagination}
          onPageChange={list.setPage}
          search={{ value: list.searchInput, onChange: list.setSearchInput, placeholder: 'Documento, nombre, teléfono o email…' }}
          onRowClick={can('clients.show') ? (client) => navigate(`/clients/${client.id}`) : undefined}
        />
      </PageBody>
      {creating && (
        <ClientFormModal
          client={null}
          onClose={() => setCreating(false)}
          onSaved={(client) => {
            if (can('clients.show')) navigate(`/clients/${client.id}`)
          }}
        />
      )}
    </>
  )
}
