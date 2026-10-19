import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ROW_STATUS_VARIANT } from "../status";
import type { StudentListEntrySummary } from "@/services/student-list.service";

export function StudentListEntriesTable({ entries }: { entries: StudentListEntrySummary[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-muted">No rows were found in this file.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Index number</TableHead>
          <TableHead>Full name</TableHead>
          <TableHead>Faculty</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Academic level</TableHead>
          <TableHead>Student category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.entryId}>
            <TableCell className="font-medium text-ink">{entry.indexNumber}</TableCell>
            <TableCell className="text-ink-muted">{entry.fullName}</TableCell>
            <TableCell className="text-ink-muted">{entry.facultyName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{entry.departmentName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{entry.academicLevelName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{entry.studentCategoryName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={ROW_STATUS_VARIANT[entry.rowStatus]}>{entry.rowStatus}</Badge>
            </TableCell>
            <TableCell className="text-ink-muted">{entry.errorReason ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
