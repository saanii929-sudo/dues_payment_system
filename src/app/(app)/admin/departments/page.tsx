import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listDepartments } from "@/services/department.service";
import { listFaculties } from "@/services/faculty.service";
import { DepartmentsTable } from "./departments-table";
import { DepartmentForm } from "./department-form";

export default async function DepartmentsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const [departments, faculties] = await Promise.all([
    listDepartments(session, session.organizationId),
    listFaculties(session, session.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Departments</h1>
        <p className="text-sm text-ink-muted">Manage departments within each faculty.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <DepartmentsTable departments={departments} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Add a department</h2>
        <div className="mt-4">
          <DepartmentForm faculties={faculties.filter((faculty) => faculty.isActive)} />
        </div>
      </div>
    </div>
  );
}
