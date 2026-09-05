import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES, DEPARTMENT_ROLES } from "@/lib/permissions/roles";

export default async function DepartmentPage({
  params,
}: PageProps<"/department/[departmentId]">) {
  const { departmentId } = await params;
  const session = await verifySession();

  // Placeholder-page check: see the equivalent note in faculty/[facultyId]/page.tsx.
  const isOwnDepartment =
    DEPARTMENT_ROLES.includes(session.role) && session.departmentId === departmentId;
  const allowed =
    session.role === ROLES.SUPER_ADMIN || session.role === ROLES.ORG_ADMIN || isOwnDepartment;

  if (!allowed) {
    redirect("/login");
  }

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold text-ink">Department dashboard</h1>
      <p className="text-sm text-ink-muted">Department ID: {departmentId}</p>
    </div>
  );
}
