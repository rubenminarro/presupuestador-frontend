import { formatGuarani } from '@/lib/format'

interface ByMethodTableProps {
  rows: { method: string; label: string; payments_count: number; total: string }[]
  paymentsCount: number
  total: string
}

/** Pagos y total por medio de pago (resumen de caja y de egresos a proveedores). */
export function ByMethodTable({ rows, paymentsCount, total }: ByMethodTableProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Por medio de pago</h3>
      </div>
      <div className="table-responsive">
        <table className="table card-table table-vcenter">
          <thead>
            <tr>
              <th>Medio</th>
              <th className="text-end">Pagos</th>
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.method}>
                <td>{row.label}</td>
                <td className="text-end">{row.payments_count}</td>
                <td className="text-end text-nowrap">{formatGuarani(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <th className="text-end">{paymentsCount}</th>
              <th className="text-end text-nowrap">{formatGuarani(total)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
