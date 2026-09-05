import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getOrgAdminDashboardMetrics } from "@/services/dashboard.service";
import { listOrganizationAuditLogs } from "@/services/audit.service";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default async function AdminPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organizationId = session.organizationId;
  const [metrics, recentActivity] = await Promise.all([
    getOrgAdminDashboardMetrics(session, organizationId),
    listOrganizationAuditLogs(session, organizationId, 10),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Organization overview</h1>
        <p className="text-sm text-ink-muted">
          Financial dashboards land here once payments go live.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Faculties" value={String(metrics.facultyCount)} />
        <StatTile label="Departments" value={String(metrics.departmentCount)} />
        <StatTile label="Academic levels" value={String(metrics.academicLevelCount)} />
        <StatTile label="Student categories" value={String(metrics.studentCategoryCount)} />
        <StatTile
          label="Payment periods"
          value={String(metrics.paymentPeriodCount)}
          hint={metrics.currentPaymentPeriodName ?? "No current period set"}
        />
        <StatTile label="Dues configurations" value={String(metrics.duesConfigurationCount)} />
        <StatTile label="Students" value={String(metrics.studentCount)} />
        <StatTile label="Active users" value={String(metrics.activeUserCount)} accent="success" />
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
