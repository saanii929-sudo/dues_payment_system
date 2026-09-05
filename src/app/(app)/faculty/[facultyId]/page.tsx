import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES, FACULTY_ROLES } from "@/lib/permissions/roles";

export default async function FacultyPage({
  params,
}: PageProps<"/faculty/[facultyId]">) {
  const { facultyId } = await params;
  const session = await verifySession();

  // Placeholder-page check: an org admin/super admin can view any faculty in
  // this phase (full org-membership verification of the target faculty
  // happens once Faculty CRUD/data exists, Phase 4+); a faculty executive
  // may only view their own faculty, matched against the session's scope —
  // never the URL alone.
  const isOwnFaculty =
    FACULTY_ROLES.includes(session.role) && session.facultyId === facultyId;
  const allowed =
    session.role === ROLES.SUPER_ADMIN || session.role === ROLES.ORG_ADMIN || isOwnFaculty;

  if (!allowed) {
    redirect("/login");
  }

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold text-ink">Faculty dashboard</h1>
      <p className="text-sm text-ink-muted">Faculty ID: {facultyId}</p>
    </div>
  );
}
