import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { CreateOrganizationForm } from "./create-organization-form";

export default async function NewOrganizationPage() {
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">New organization</h1>
        <p className="text-sm text-ink-muted">
          Its first revenue split rule is seeded from the platform defaults.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
