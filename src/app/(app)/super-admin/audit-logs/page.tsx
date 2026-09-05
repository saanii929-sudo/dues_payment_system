import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listRecentAuditLogs } from "@/services/audit.service";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default async function AuditLogsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  const logs = await listRecentAuditLogs(session, 200);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Audit logs</h1>
        <p className="text-sm text-ink-muted">
          The latest {logs.length} platform events, newest first.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        {logs.length === 0 ? (
          <p className="text-sm text-ink-muted">No activity recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-ink">{log.action}</TableCell>
                  <TableCell className="text-ink-muted">{log.actorEmail ?? "System"}</TableCell>
                  <TableCell className="text-ink-muted">{log.targetType}</TableCell>
                  <TableCell className="text-ink-muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
