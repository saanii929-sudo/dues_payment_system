import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listAcademicLevels } from "@/services/academic-level.service";
import { AcademicLevelsTable } from "./academic-levels-table";
import { AcademicLevelForm } from "./academic-level-form";

export default async function AcademicLevelsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const levels = await listAcademicLevels(session, session.organizationId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Academic levels</h1>
        <p className="text-sm text-ink-muted">Manage your organization&apos;s academic levels.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <AcademicLevelsTable levels={levels} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Add an academic level</h2>
        <div className="mt-4">
          <AcademicLevelForm />
        </div>
      </div>
    </div>
  );
}
