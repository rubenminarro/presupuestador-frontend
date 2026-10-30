import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/DataTable'
import { reportsApi, type ClientsReport, type ReportParams } from '@/features/reports/api'
import { ReportView, StatTile } from '@/features/reports/ReportParts'
import { formatDate, formatGuarani, formatPeriod } from '@/lib/format'

export function ClientsReportView({ params }: { params: ReportParams }) {
  const query = useQuery({
    queryKey: ['reports', 'clients', params],
    queryFn: () => reportsApi.clients(params),
    placeholderData: keepPreviousData,
  })

  return <ReportView query={query}>{(report) => <Clients report={report} />}</ReportView>
}

function clientLink(row: { client_id: number; full_name: string | null }) {
  return <Link to={`/clients/${row.client_id}`}>{row.full_name ?? `#${row.client_id}`}</Link>
}

function Clients({ report }: { report: ClientsReport }) {
  return (
    <>
      <p className="text-secondary">
        {formatPeriod(report.period)} · facturación con IVA por fecha de emisión; los saldos por cobrar son a hoy.
      </p>
      <div className="row row-cards mb-3">
        <StatTile className="col-12 col-sm-6" label="Clientes nuevos" value={report.new_clients} />
        <StatTile
          className="col-12 col-sm-6"
          label="Por cobrar"
          value={formatGuarani(report.receivables.total)}
          hint={`${report.receivables.clients.length} cliente(s) con saldo`}
        />
      </div>
      <div className="row row-cards">
        <div className="col-12 col-lg-6">
          <DataTable
            title="Clientes que más facturan"
            rows={report.top_clients}
            rowKey={(row) => row.client_id}
            emptyMessage="Sin facturas emitidas en el período."
            columns={[
              { key: 'client', header: 'Cliente', render: clientLink },
              { key: 'count', header: 'Facturas', className: 'text-end', render: (row) => row.invoices_count },
              { key: 'total', header: 'Total', className: 'text-end text-nowrap', render: (row) => formatGuarani(row.total) },
            ]}
          />
        </div>
        <div className="col-12 col-lg-6">
          <DataTable
            title="Vehículos con más visitas"
            rows={report.top_vehicles}
            rowKey={(row) => row.vehicle_id}
            emptyMessage="Sin recepciones en el período."
            columns={[
              {
                key: 'plate',
                header: 'Vehículo',
                render: (row) => <Link to={`/vehicles/${row.vehicle_id}`}>{row.plate ?? `#${row.vehicle_id}`}</Link>,
              },
              { key: 'visits', header: 'Recepciones', className: 'text-end', render: (row) => row.visits },
            ]}
          />
        </div>
        <div className="col-12">
          <DataTable
            title="Saldos por cobrar"
            rows={report.receivables.clients}
            rowKey={(row) => row.client_id}
            emptyMessage="No hay facturas con saldo pendiente."
            columns={[
              {
                key: 'client',
                header: 'Cliente',
                render: (row) => (
                  <>
                    {clientLink(row)}
                    {row.recipient_type === 'insurer' && <span className="badge bg-azure-lt ms-2">{row.recipient_label}</span>}
                  </>
                ),
              },
              { key: 'phone', header: 'Teléfono', render: (row) => row.phone ?? '—' },
              { key: 'count', header: 'Facturas', className: 'text-end', render: (row) => row.invoices_count },
              { key: 'oldest', header: 'Vencimiento más antiguo', render: (row) => formatDate(row.oldest_due_date) },
              { key: 'balance', header: 'Saldo', className: 'text-end text-nowrap', render: (row) => formatGuarani(row.balance) },
            ]}
          />
        </div>
      </div>
    </>
  )
}
