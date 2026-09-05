import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listOrganizationRoleAssignments } from "@/services/role-assignment.service";
import { listFaculties } from "@/services/faculty.service";
import { listDepartments } from "@/services/department.service";
import { UsersTable } from "./users-table";
import { RoleAssignmentForm } from "./role-assignment-form";

export default async function AdminUsersPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organizationId = session.organizationId;
  const [assignments, faculties, departments] = await Promise.all([
    listOrganizationRoleAssignments(session, organizationId),
    listFaculties(session, organizationId),
    listDepartments(session, organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Users & roles</h1>
        <p className="text-sm text-ink-muted">
          Manage accounts and assign faculty/department executives within your organization.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <UsersTable assignments={assignments} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Assign a role</h2>
        <div className="mt-4">
          <RoleAssignmentForm
            faculties={faculties.filter((faculty) => faculty.isActive)}
            departments={departments.filter((department) => department.isActive)}
          />
        </div>
      </div>
    </div>
  );
}
