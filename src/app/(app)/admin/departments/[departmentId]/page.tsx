import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getDepartmentDetails } from "@/services/department.service";
import { listFaculties } from "@/services/faculty.service";
import {
  listDepartmentExecutives,
  listDepartmentExecutiveHistory,
} from "@/services/department-executive.service";
import { Badge } from "@/components/ui/badge";
import { EditDepartmentForm } from "./edit-department-form";
import { DepartmentActions } from "./department-actions";
import { ExecutivesTable } from "./executives-table";
import { CreateExecutiveDialog } from "./create-executive-dialog";
import { ExecutiveHistoryTable } from "./executive-history-table";

export default async function DepartmentDetailsPage({
  params,
}: PageProps<"/admin/departments/[departmentId]">) {
  const { departmentId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organizationId = session.organizationId;
  const [department, faculties, executives, executiveHistory] = await Promise.all([
    getDepartmentDetails(session, organizationId, departmentId),
    listFaculties(session, organizationId),
    listDepartmentExecutives(session, organizationId, departmentId),
    listDepartmentExecutiveHistory(session, organizationId, departmentId),
  ]);

  const hod = executives.find((executive) => executive.role === ROLES.DEPT_HOD) ?? null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{department.name}</h1>
          <p className="text-sm text-ink-muted">
            {department.code} · {department.facultyName}
          </p>
        </div>
        <Badge variant={department.isActive ? "success" : "danger"}>
          {department.isActive ? "Active" : "Deactivated"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Students</p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{department.studentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Head of Department
          </p>
          <p className="mt-1.5 text-lg font-semibold text-ink">
            {hod ? hod.fullName : "Not assigned"}
          </p>
          {hod && <p className="text-xs text-ink-muted">{hod.email}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Officials</h2>
          <CreateExecutiveDialog departmentId={department.departmentId} />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          The HOD is the sole approval authority for this department&apos;s withdrawal requests —
          at most one active HOD is allowed at a time.
        </p>
        <div className="mt-3">
          <ExecutivesTable departmentId={department.departmentId} executives={executives} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Appointment history</h2>
        <div className="mt-3">
          <ExecutiveHistoryTable history={executiveHistory} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Edit department</h2>
        <div className="mt-4">
          <EditDepartmentForm
            department={department}
            faculties={faculties.filter((faculty) => faculty.isActive)}
          />
        </div>
      </div>

      <DepartmentActions
        departmentId={department.departmentId}
        isActive={department.isActive}
        departmentName={department.name}
      />
    </div>
  );
}
