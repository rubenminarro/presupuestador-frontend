import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MOVEMENT_TYPE } from '@/features/inventory/api'
import { reportsApi, type InventoryReport, type ReportParams } from '@/features/reports/api'
import { ReportView, StatTile } from '@/features/reports/ReportParts'
import { formatMoney, formatPeriod, formatQuantity } from '@/lib/format'

export function InventoryReportView({ params }: { params: ReportParams }) {
  const query = useQuery({
    queryKey: ['reports', 'inventory', params],
    queryFn: () => reportsApi.inventory(params),
    placeholderData: keepPreviousData,
  })

  return <ReportView query={query}>{(report) => <Inventory report={report} />}</ReportView>
}

function partLink(row: { part_id: number; part_code: string | null; name: string | null }) {
  return (
    <>
      <Link to={`/parts/${row.part_id}`}>{row.part_code ?? `#${row.part_id}`}</Link>
      <div className="text-secondary small">{row.name}</div>
    </>
  )
}

function Inventory({ report }: { report: InventoryReport }) {
  return (
    <>
      <p className="text-secondary">
        Valor del stock y faltantes a hoy (a costo promedio, sin IVA); consumo y movimientos {formatPeriod(report.period).toLowerCase()}.
      </p>
      <div className="row row-cards mb-3">
        <StatTile className="col-12 col-sm-6" label="Valor del stock" value={formatMoney(report.stock_value)} />
        <StatTile className="col-12 col-sm-6" label="Repuestos bajo el mínimo" value={report.below_minimum.length} />
      </div>
      <div className="row row-cards">
        <div className="col-12 col-lg-6">
          <DataTable
            title="Bajo el mínimo"
            rows={report.below_minimum}
            rowKey={(row) => row.part_id}
            emptyMessage="Ningún repuesto está por debajo de su mínimo."
            columns={[
              { key: 'part', header: 'Repuesto', render: partLink },
              { key: 'minimum', header: 'Mínimo', className: 'text-end', render: (row) => formatQuantity(row.minimum_stock) },
              { key: 'on_hand', header: 'En stock', className: 'text-end', render: (row) => formatQuantity(row.quantity_on_hand) },
              { key: 'available', header: 'Disponible', className: 'text-end', render: (row) => formatQuantity(row.quantity_available) },
            ]}
          />
        </div>
        <div className="col-12 col-lg-6">
          <DataTable
            title="Más consumidos en OT"
            rows={report.top_consumed}
            rowKey={(row) => row.part_id}
            emptyMessage="Sin consumos en el período."
            columns={[
              { key: 'part', header: 'Repuesto', render: partLink },
              { key: 'quantity', header: 'Cantidad neta', className: 'text-end', render: (row) => formatQuantity(row.quantity) },
              { key: 'cost', header: 'Costo', className: 'text-end text-nowrap', render: (row) => formatMoney(row.cost) },
            ]}
          />
        </div>
        <div className="col-12">
          <DataTable
            title="Movimientos por tipo"
            rows={report.movements_by_type}
            rowKey={(row) => row.type}
            emptyMessage="Sin movimientos en el período."
            columns={[
              { key: 'type', header: 'Tipo', render: (row) => <StatusBadge value={row.type} map={MOVEMENT_TYPE} /> },
              { key: 'count', header: 'Movimientos', className: 'text-end', render: (row) => row.movements_count },
              { key: 'quantity', header: 'Cantidad', className: 'text-end', render: (row) => formatQuantity(row.quantity) },
              { key: 'cost', header: 'Costo total', className: 'text-end text-nowrap', render: (row) => formatMoney(row.total_cost) },
            ]}
          />
        </div>
      </div>
    </>
  )
}
