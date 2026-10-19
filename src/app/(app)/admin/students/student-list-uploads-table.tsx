import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UPLOAD_STATUS_VARIANT, formatDateTime } from "./status";
import type { StudentListUploadSummary } from "@/services/student-list.service";

export function StudentListUploadsTable({ uploads }: { uploads: StudentListUploadSummary[] }) {
  if (uploads.length === 0) {
    return <p className="text-sm text-ink-muted">No student lists uploaded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Format</TableHead>
          <TableHead>Uploaded by</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Valid</TableHead>
          <TableHead>Failed</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {uploads.map((upload) => (
          <TableRow key={upload.uploadId}>
            <TableCell className="font-medium text-ink">
              <Link href={`/admin/students/${upload.uploadId}`} className="hover:underline">
                {upload.fileName}
              </Link>
            </TableCell>
            <TableCell className="text-ink-muted">{upload.fileFormat}</TableCell>
            <TableCell className="text-ink-muted">{upload.uploadedByName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={UPLOAD_STATUS_VARIANT[upload.status]}>{upload.status}</Badge>
            </TableCell>
            <TableCell className="text-ink-muted">{upload.totalRows}</TableCell>
            <TableCell className="text-ink-muted">{upload.successRows}</TableCell>
            <TableCell className="text-ink-muted">{upload.failedRows}</TableCell>
            <TableCell className="text-ink-muted">{formatDateTime(upload.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
