import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { IconArrowLeft } from "@tabler/icons-react";
import { DataTable } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/States";
import {
  reportsApi,
  type ReceivablesReport,
  type ReceivableTotals,
  type RecipientType,
} from "@/features/reports/api";
import { ReportView, StatTile } from "@/features/reports/ReportParts";
import type { ReportViewProps } from "@/features/reports/ReportsPage";
import { formatDate, formatGuarani } from "@/lib/format";

const RECIPIENTS: { value: RecipientType | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "insurer", label: "Aseguradoras" },
  { value: "customer", label: "Clientes" },
];

/** Cuentas por cobrar a hoy (M11), por tipo de destinatario; con un cliente elegido, sus facturas. */
export function ReceivablesReportView({
  params,
  filters,
  setFilters,
}: ReportViewProps) {
  const query = useQuery({
    queryKey: ["reports", "receivables", params],
    queryFn: () => reportsApi.receivables(params),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="btn-group mb-3" role="group" aria-label="Destinatario">
        {RECIPIENTS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn ${filters.recipient_type === option.value ? "btn-primary" : "btn-outline-primary"}`}
            aria-pressed={filters.recipient_type === option.value}
            onClick={() =>
              setFilters({ recipient_type: option.value, client_id: null })
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      <ReportView query={query}>
        {(report) => (
          <Receivables
            report={report}
            clientId={filters.client_id}
            onClient={(clientId) => setFilters({ client_id: clientId })}
          />
        )}
      </ReportView>
    </>
  );
}

function Receivables({
  report,
  clientId,
  onClient,
}: {
  report: ReceivablesReport;
  clientId: number | null;
  onClient: (id: number | null) => void;
}) {
  const client =
    clientId === null
      ? null
      : report.clients.find((row) => row.client_id === clientId);

  return (
    <>
      <p className="text-secondary">
        Al {formatDate(report.as_of)} · facturas emitidas con saldo (descuenta
        pagos y notas de crédito), importes con IVA. Vence en la fecha de
        vencimiento o, al contado, en la emisión.
      </p>
      <Totals totals={report.totals} />
      {clientId === null && report.by_recipient.length > 1 && (
        <div className="row row-cards mb-3">
          {report.by_recipient.map((group) => (
            <div key={group.recipient_type} className="col-12 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="subheader">{group.recipient_label}</div>
                  <div className="h2 mb-1">{formatGuarani(group.balance)}</div>
                  <div className="small text-secondary">
                    {group.invoices_count} factura(s) · vencido{" "}
                    {formatGuarani(group.overdue)} · no vencido{" "}
                    {formatGuarani(group.not_overdue)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {clientId === null ? (
        <DataTable
          title="Por cliente"
          rows={report.clients}
          rowKey={(row) => row.client_id}
          onRowClick={(row) => onClient(row.client_id)}
          emptyMessage="No hay facturas con saldo pendiente."
          columns={[
            {
              key: "client",
              header: "Cliente",
              render: (row) => (
                <>
                  <div>{row.full_name ?? `#${row.client_id}`}</div>
                  <div className="small text-secondary">
                    {row.document_number ?? "—"}
                  </div>
                </>
              ),
            },
            {
              key: "type",
              header: "Tipo",
              render: (row) => (
                <span
                  className={`badge ${row.recipient_type === "insurer" ? "bg-azure-lt" : "bg-secondary-lt"}`}
                >
                  {row.recipient_label}
                </span>
              ),
            },
            {
              key: "count",
              header: "Facturas",
              className: "text-end",
              render: (row) => row.invoices_count,
            },
            {
              key: "oldest",
              header: "Vence desde",
              className: "text-nowrap",
              render: (row) => formatDate(row.oldest_due_date),
            },
            {
              key: "days",
              header: "Máx. atraso",
              className: "text-end text-nowrap",
              render: (row) =>
                row.max_days_overdue > 0 ? (
                  <span className="text-red">{row.max_days_overdue} días</span>
                ) : (
                  "—"
                ),
            },
            {
              key: "overdue",
              header: "Vencido",
              className: "text-end text-nowrap",
              render: (row) => formatGuarani(row.overdue),
            },
            {
              key: "balance",
              header: "Saldo",
              className: "text-end text-nowrap fw-bold",
              render: (row) => formatGuarani(row.balance),
            },
          ]}
        />
      ) : (
        <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <button
              type="button"
              className="btn btn-link px-0"
              onClick={() => onClient(null)}
            >
              <IconArrowLeft size={18} className="me-1" aria-hidden="true" />
              Todos los clientes
            </button>
            {client && (
              <span>
                <Link to={`/clients/${client.client_id}`}>
                  {client.full_name}
                </Link>
                <span className="badge bg-secondary-lt ms-2">
                  {client.recipient_label}
                </span>
              </span>
            )}
          </div>
          {/* Mientras llega el reporte del cliente se ve el anterior, que no trae `invoices`. */}
          {report.invoices === undefined ? (
            <div className="card">
              <LoadingState />
            </div>
          ) : (
            <DataTable
              title="Facturas con saldo"
              rows={report.invoices}
              rowKey={(row) => row.invoice_id}
              emptyMessage="El cliente no tiene facturas con saldo."
              columns={[
                {
                  key: "number",
                  header: "Factura",
                  render: (row) => (
                    <Link to={`/invoices/${row.invoice_id}`}>{row.number}</Link>
                  ),
                },
                {
                  key: "origin",
                  header: "OT · siniestro",
                  render: (row) =>
                    [row.work_order_code, row.claim_code]
                      .filter(Boolean)
                      .join(" · ") || "—",
                },
                {
                  key: "due",
                  header: "Vence",
                  className: "text-nowrap",
                  render: (row) => (
                    <>
                      {formatDate(row.due_date)}
                      <div className="small text-secondary">
                        {row.condition}
                      </div>
                    </>
                  ),
                },
                {
                  key: "days",
                  header: "Atraso",
                  className: "text-end text-nowrap",
                  render: (row) =>
                    row.days_overdue > 0 ? (
                      <span className="text-red">{row.days_overdue} días</span>
                    ) : (
                      "—"
                    ),
                },
                {
                  key: "total",
                  header: "Total",
                  className: "text-end text-nowrap",
                  render: (row) => formatGuarani(row.total),
                },
                {
                  key: "paid",
                  header: "Cobrado",
                  className: "text-end text-nowrap",
                  render: (row) => formatGuarani(row.paid_total),
                },
                {
                  key: "credited",
                  header: "Acreditado",
                  className: "text-end text-nowrap",
                  render: (row) => formatGuarani(row.credited_total),
                },
                {
                  key: "balance",
                  header: "Saldo",
                  className: "text-end text-nowrap fw-bold",
                  render: (row) => formatGuarani(row.balance),
                },
              ]}
            />
          )}
        </>
      )}
    </>
  );
}

function Totals({ totals }: { totals: ReceivableTotals }) {
  return (
    <div className="row row-cards mb-3">
      <StatTile
        label="Por cobrar"
        value={formatGuarani(totals.balance)}
        hint={`${totals.invoices_count} factura(s)`}
      />
      <StatTile label="Vencido" value={formatGuarani(totals.overdue)} />
      <StatTile label="No vencido" value={formatGuarani(totals.not_overdue)} />
      <div className="col-6 col-lg-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="subheader">Vencido por días de atraso</div>
            {(
              [
                ["1 a 30", totals.days_1_30],
                ["31 a 60", totals.days_31_60],
                ["61 a 90", totals.days_61_90],
                ["Más de 90", totals.days_over_90],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="d-flex justify-content-between small">
                <span>{label}</span>
                <span
                  className={Number(value) > 0 ? "text-red" : "text-secondary"}
                >
                  {formatGuarani(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
