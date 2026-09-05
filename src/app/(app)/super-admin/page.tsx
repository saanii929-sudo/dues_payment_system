import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import {
  getSuperAdminDashboardMetrics,
  getTransactionVolumeTrend,
} from "@/services/dashboard.service";
import { listRecentAuditLogs } from "@/services/audit.service";
import { StatTile } from "@/components/dashboard/stat-tile";
import { VolumeTrendChart } from "@/components/finance/volume-trend-chart";
import { formatPesewas } from "@/lib/format/currency";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default async function SuperAdminPage() {
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  const [metrics, trend, recentActivity] = await Promise.all([
    getSuperAdminDashboardMetrics(session),
    getTransactionVolumeTrend(session, 14),
    listRecentAuditLogs(session, 10),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Platform overview</h1>
        <p className="text-sm text-ink-muted">Real-time metrics across every organization.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total organizations" value={String(metrics.totalOrganizations)} />
        <StatTile label="Active organizations" value={String(metrics.activeOrganizations)} accent="success" />
        <StatTile label="Total students" value={String(metrics.totalStudents)} />
        <StatTile
          label="Successful payments"
          value={String(metrics.totalSuccessfulPayments)}
          accent="success"
        />
        <StatTile
          label="Transaction volume"
          value={formatPesewas(metrics.totalTransactionVolumePesewas)}
        />
        <StatTile label="Pending payments" value={String(metrics.pendingPayments)} accent="pending" />
        <StatTile label="Failed payments" value={String(metrics.failedPayments)} accent="danger" />
        <StatTile
          label="Faculty balances"
          value={formatPesewas(metrics.totalFacultyBalancesPesewas)}
        />
        <StatTile
          label="Department balances"
          value={formatPesewas(metrics.totalDepartmentBalancesPesewas)}
        />
        <StatTile
          label="Pending withdrawals"
          value={String(metrics.pendingWithdrawals)}
          accent="pending"
        />
        <StatTile
          label="Released funds"
          value={formatPesewas(metrics.releasedFundsPesewas)}
          accent="success"
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Transaction volume — last 14 days</h2>
        <div className="mt-4">
          <VolumeTrendChart points={trend} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
        <div className="mt-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-ink-muted">No activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium text-ink">{entry.action}</TableCell>
                    <TableCell className="text-ink-muted">{entry.actorEmail ?? "System"}</TableCell>
                    <TableCell className="text-ink-muted">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
