import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listFaculties } from "@/services/faculty.service";
import { FacultiesTable } from "./faculties-table";
import { FacultyForm } from "./faculty-form";

export default async function FacultiesPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const faculties = await listFaculties(session, session.organizationId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Faculties</h1>
        <p className="text-sm text-ink-muted">Manage your organization&apos;s faculties.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <FacultiesTable faculties={faculties} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Add a faculty</h2>
        <div className="mt-4">
          <FacultyForm />
        </div>
      </div>
    </div>
  );
}
