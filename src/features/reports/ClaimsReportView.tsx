import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/DataTable'
import { reportsApi, type ClaimsReport } from '@/features/reports/api'
import { ReportView, StatTile } from '@/features/reports/ReportParts'
import type { ReportViewProps } from '@/features/reports/ReportsPage'
import { formatDate, formatGuarani, formatMoney, formatPeriod } from '@/lib/format'

/** Siniestros del período (M11), de lo presupuestado a lo cobrado. El CSV y el PDF traen cada importe en su columna. */
export function ClaimsReportView({ params }: ReportViewProps) {
  const query = useQuery({
    queryKey: ['reports', 'claims', params],
    queryFn: () => reportsApi.claims(params),
    placeholderData: keepPreviousData,
  })

  return <ReportView query={query}>{(report) => <Claims report={report} />}</ReportView>
}

/** Cifras apiladas con su rótulo, en una celda. */
function Stack({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="small">
      {rows.map(([label, value]) => (
        <div key={label} className="d-flex justify-content-between gap-2 text-nowrap">
          <span className="text-secondary">{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}

function Claims({ report }: { report: ClaimsReport }) {
  const { totals } = report

  return (
    <>
      <p className="text-secondary">
        {formatPeriod(report.period)} · por fecha del siniestro. Presupuestado, autorizado, aceptado y repartido sin IVA; facturado
        neto (emitido menos notas de crédito), cobrado y saldo con IVA.
      </p>
      <div className="row row-cards mb-3">
        <StatTile label="Siniestros" value={totals.claims_count} />
        <StatTile label="Autorizado (sin IVA)" value={formatMoney(totals.authorized_total)} hint={`presupuestado ${formatMoney(totals.budgeted_insurer)}`} />
        <StatTile
          label="Facturado a aseguradoras"
          value={formatGuarani(totals.invoiced_insurer)}
          hint={`cobrado ${formatGuarani(totals.collected_insurer)} · saldo ${formatGuarani(totals.balance_insurer)}`}
        />
        <StatTile
          label="Facturado a clientes"
          value={formatGuarani(totals.invoiced_customer)}
          hint={`cobrado ${formatGuarani(totals.collected_customer)} · saldo ${formatGuarani(totals.balance_customer)}`}
        />
      </div>
      <DataTable
        title="Siniestros"
        rows={report.claims}
        rowKey={(row) => row.claim_id}
        emptyMessage="No hay siniestros en el período."
        columns={[
          {
            key: 'claim',
            header: 'Siniestro',
            render: (row) => (
              <>
                <Link to={`/claims/${row.claim_id}`}>{row.code}</Link>
                {row.claim_number && <span className="small text-secondary"> · {row.claim_number}</span>}
                <div className="small">{row.insurer_name ?? '—'}</div>
                <div className="small text-secondary">
                  {[row.plate, formatDate(row.loss_date), row.status].filter(Boolean).join(' · ')}
                </div>
                <div className="small text-secondary">
                  Deducible {row.deductible_amount === null ? 'desconocido' : formatMoney(row.deductible_amount)}
                </div>
              </>
            ),
          },
          {
            key: 'budget',
            header: 'Presupuesto (sin IVA)',
            render: (row) => (
              <Stack
                rows={[
                  ['Aseg.', formatMoney(row.budgeted_insurer)],
                  ['Autoriz.', formatMoney(row.authorized_total)],
                  ['Acept. dueño', formatMoney(row.accepted_owner_amount)],
                ]}
              />
            ),
          },
          {
            key: 'allocation',
            header: 'Reparto (sin IVA)',
            render: (row) => (
              <Stack
                rows={[
                  ['Aseg.', formatMoney(row.allocated_insurer)],
                  ['Dueño', formatMoney(row.allocated_owner)],
                  ['Taller', formatMoney(row.allocated_workshop)],
                ]}
              />
            ),
          },
          {
            key: 'insurer',
            header: 'Aseguradora (con IVA)',
            render: (row) => (
              <Stack
                rows={[
                  ['Fact.', formatGuarani(row.invoiced_insurer)],
                  ['Cobr.', formatGuarani(row.collected_insurer)],
                  ['Saldo', formatGuarani(row.balance_insurer)],
                ]}
              />
            ),
          },
          {
            key: 'customer',
            header: 'Clientes (con IVA)',
            render: (row) => (
              <Stack
                rows={[
                  ['Fact.', formatGuarani(row.invoiced_customer)],
                  ['Cobr.', formatGuarani(row.collected_customer)],
                  ['Saldo', formatGuarani(row.balance_customer)],
                ]}
              />
            ),
          },
          {
            key: 'alerts',
            header: 'Alertas',
            className: 'text-center',
            render: (row) => (row.alerts_count > 0 ? <span className="badge bg-yellow-lt">{row.alerts_count}</span> : '—'),
          },
        ]}
      />
    </>
  )
}
