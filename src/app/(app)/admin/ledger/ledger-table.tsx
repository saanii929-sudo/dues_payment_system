import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/finance/money";
import { LedgerStatusBadge } from "@/components/finance/ledger-status-badge";
import { AdjustLedgerEntryDialog } from "./adjust-ledger-entry-dialog";
import type { LedgerEntrySummary } from "@/services/revenue-allocation.service";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}

export function LedgerTable({ entries }: { entries: LedgerEntrySummary[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-muted">No allocations yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Faculty</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Level</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Total paid</TableHead>
          <TableHead>Faculty share</TableHead>
          <TableHead>Department share</TableHead>
          <TableHead>Rule</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.allocationId}>
            <TableCell className="font-medium text-ink">{entry.studentIndexNumber}</TableCell>
            <TableCell className="text-ink-muted">{entry.facultyName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{entry.departmentName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{entry.studentCategoryName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{entry.academicLevelName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{entry.paymentPeriodName}</TableCell>
            <TableCell className="text-ink-muted">
              <Money amountPesewas={entry.totalAmountPesewas} />
            </TableCell>
            <TableCell className="text-ink-muted">
              <Money amountPesewas={entry.facultyShareAmountPesewas} />
            </TableCell>
            <TableCell className="text-ink-muted">
              <Money amountPesewas={entry.departmentShareAmountPesewas} />
            </TableCell>
            <TableCell className="text-ink-muted">{entry.ruleNameSnapshot}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <LedgerStatusBadge status={entry.status} />
                {entry.adjustsEntryId && (
                  <p className="text-xs text-ink-muted" title={entry.adjustsEntryId}>
                    Adjusts an earlier entry
                  </p>
                )}
                {entry.status === "ADJUSTED" && (
                  <p className="text-xs text-ink-muted">Superseded</p>
                )}
              </div>
            </TableCell>
            <TableCell className="text-ink-muted">{formatDateTime(entry.createdAt)}</TableCell>
            <TableCell className="text-right space-x-1.5">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/payments/${entry.paymentId}`}>View payment</Link>
              </Button>
              {entry.status === "ALLOCATED" && <AdjustLedgerEntryDialog entry={entry} />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
