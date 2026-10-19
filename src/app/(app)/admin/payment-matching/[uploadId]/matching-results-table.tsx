import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/finance/money";
import { MATCHING_STATUS_VARIANT, MATCHING_STATUS_LABEL, formatDateTime } from "../status";
import type { MatchingRowResult } from "@/services/student-payment-matching.service";

export function MatchingResultsTable({ rows }: { rows: MatchingRowResult[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">No roster rows are in scope for this filter selection.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Index number</TableHead>
          <TableHead>Full name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Matched amount</TableHead>
          <TableHead>Matched at</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.entryId}>
            <TableCell className="font-medium text-ink">{row.indexNumber}</TableCell>
            <TableCell className="text-ink-muted">{row.fullName}</TableCell>
            <TableCell>
              <Badge variant={MATCHING_STATUS_VARIANT[row.status]}>{MATCHING_STATUS_LABEL[row.status]}</Badge>
            </TableCell>
            <TableCell className="text-ink-muted">
              {row.matchedAmountPesewas != null ? <Money amountPesewas={row.matchedAmountPesewas} /> : "—"}
            </TableCell>
            <TableCell className="text-ink-muted">{row.matchedAt ? formatDateTime(row.matchedAt) : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
