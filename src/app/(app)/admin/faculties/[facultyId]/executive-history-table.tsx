import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { FacultyExecutiveHistoryEntry } from "@/services/faculty-executive.service";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}

/** Every UserRole row ever created for this faculty's three roles — active or revoked, the full history. */
export function ExecutiveHistoryTable({ history }: { history: FacultyExecutiveHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-ink-muted">No history yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assigned</TableHead>
          <TableHead>Revoked</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((entry) => (
          <TableRow key={entry.userRoleId}>
            <TableCell className="text-ink-muted">{entry.role}</TableCell>
            <TableCell className="font-medium text-ink">
              {entry.fullName}
              <span className="block text-xs text-ink-muted">{entry.email}</span>
            </TableCell>
            <TableCell>
              <Badge variant={entry.status === "ACTIVE" ? "success" : "neutral"}>
                {entry.status === "ACTIVE" ? "Active" : "Revoked"}
              </Badge>
            </TableCell>
            <TableCell className="text-ink-muted">
              {formatDateTime(entry.assignedAt)}
              {entry.assignedByName && (
                <span className="block text-xs">by {entry.assignedByName}</span>
              )}
            </TableCell>
            <TableCell className="text-ink-muted">
              {entry.revokedAt ? (
                <>
                  {formatDateTime(entry.revokedAt)}
                  {entry.revokedByName && (
                    <span className="block text-xs">by {entry.revokedByName}</span>
                  )}
                </>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
