import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getCollectionReport, getOrgTransactionVolumeTrend } from "@/services/payment.service";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Money } from "@/components/finance/money";
import { VolumeTrendChart } from "@/components/finance/volume-trend-chart";
import { formatPesewas } from "@/lib/format/currency";
import type { CollectionReportRow } from "@/services/payment.service";

function BreakdownTable({ title, rows }: { title: string; rows: CollectionReportRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No successful payments yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span className="text-ink">{row.label}</span>
              <span className="flex items-center gap-3">
                <span className="text-ink-muted">{row.count} payment{row.count === 1 ? "" : "s"}</span>
                <span className="font-medium tabular-nums text-ink">
                  <Money amountPesewas={row.amountPesewas} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function CollectionReportsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const [report, trend] = await Promise.all([
    getCollectionReport(session, session.organizationId),
    getOrgTransactionVolumeTrend(session, session.organizationId, 14),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Collection reports</h1>
        <p className="text-sm text-ink-muted">Confirmed, successful collections only.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile
          label="Total collected"
          value={formatPesewas(report.totalAmountPesewas)}
          accent="success"
        />
        <StatTile label="Successful payments" value={String(report.totalCount)} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Collections — last 14 days</h2>
        <div className="mt-3">
          <VolumeTrendChart points={trend} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownTable title="By payment period" rows={report.byPeriod} />
        <BreakdownTable title="By faculty" rows={report.byFaculty} />
        <BreakdownTable title="By department" rows={report.byDepartment} />
      </div>
    </div>
  );
}
