import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getStudentListUploadDetails, StudentListError } from "@/services/student-list.service";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UPLOAD_STATUS_VARIANT, formatDateTime } from "../status";
import { StudentListEntriesTable } from "./student-list-entries-table";

export default async function StudentListUploadDetailPage({
  params,
}: PageProps<"/admin/students/[uploadId]">) {
  const { uploadId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  let details;
  try {
    details = await getStudentListUploadDetails(session, session.organizationId, uploadId);
  } catch (error) {
    if (error instanceof StudentListError) redirect("/admin/students");
    throw error;
  }

  const invalidCount = details.entries.filter((e) => e.rowStatus === "INVALID").length;
  const duplicateCount = details.entries.filter((e) => e.rowStatus === "DUPLICATE").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{details.fileName}</h1>
          <p className="text-sm text-ink-muted">
            Uploaded {formatDateTime(details.createdAt)} ·{" "}
            <Badge variant={UPLOAD_STATUS_VARIANT[details.status]}>{details.status}</Badge>
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <a href={`/api/admin/student-uploads/${details.uploadId}/download`}>Download original file</a>
        </Button>
      </div>

      {details.errorLog && (
        <div className="rounded-lg border border-danger bg-danger-muted p-4 text-sm text-danger">
          {details.errorLog}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total rows" value={String(details.totalRows)} />
        <StatTile label="Valid" value={String(details.successRows)} accent="success" />
        <StatTile label="Invalid" value={String(invalidCount)} accent="danger" />
        <StatTile label="Duplicate" value={String(duplicateCount)} accent="pending" />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <StudentListEntriesTable entries={details.entries} />
      </div>

      <Link href="/admin/students" className="text-sm text-accent hover:underline">
        ← Back to student lists
      </Link>
    </div>
  );
}
