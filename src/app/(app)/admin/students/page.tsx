import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listStudentListUploads } from "@/services/student-list.service";
import { StudentListUploadsTable } from "./student-list-uploads-table";
import { UploadStudentListDialog } from "./upload-student-list-dialog";

export default async function StudentListsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const uploads = await listStudentListUploads(session, session.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">Student lists</h1>
          <p className="text-sm text-ink-muted">
            Upload the official student roster as a CSV or Excel file — each upload is validated
            row by row and the original file is preserved.
          </p>
        </div>
        <UploadStudentListDialog />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <StudentListUploadsTable uploads={uploads} />
      </div>
    </div>
  );
}
