import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getFacultyDetails } from "@/services/faculty.service";
import {
  listFacultyExecutives,
  listFacultyExecutiveHistory,
} from "@/services/faculty-executive.service";
import { Badge } from "@/components/ui/badge";
import { EditFacultyForm } from "./edit-faculty-form";
import { FacultyActions } from "./faculty-actions";
import { ExecutivesTable } from "./executives-table";
import { CreateExecutiveDialog } from "./create-executive-dialog";
import { ExecutiveHistoryTable } from "./executive-history-table";

export default async function FacultyDetailsPage({
  params,
}: PageProps<"/admin/faculties/[facultyId]">) {
  const { facultyId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organizationId = session.organizationId;
  const [faculty, executives, executiveHistory] = await Promise.all([
    getFacultyDetails(session, organizationId, facultyId),
    listFacultyExecutives(session, organizationId, facultyId),
    listFacultyExecutiveHistory(session, organizationId, facultyId),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{faculty.name}</h1>
          <p className="text-sm text-ink-muted">{faculty.code}</p>
        </div>
        <Badge variant={faculty.isActive ? "success" : "danger"}>
          {faculty.isActive ? "Active" : "Deactivated"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Departments
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{faculty.departmentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Students</p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{faculty.studentCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Executives</h2>
          <CreateExecutiveDialog facultyId={faculty.facultyId} />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          The Dean is the sole approval authority for this faculty&apos;s withdrawal requests — at
          most one active Dean is allowed at a time.
        </p>
        <div className="mt-3">
          <ExecutivesTable facultyId={faculty.facultyId} executives={executives} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Executive history</h2>
        <div className="mt-3">
          <ExecutiveHistoryTable history={executiveHistory} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Edit faculty</h2>
        <div className="mt-4">
          <EditFacultyForm faculty={faculty} />
        </div>
      </div>

      <FacultyActions
        facultyId={faculty.facultyId}
        isActive={faculty.isActive}
        facultyName={faculty.name}
      />
    </div>
  );
}
