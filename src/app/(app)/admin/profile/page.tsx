import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getOrganizationDetails } from "@/services/organization.service";
import { ProfileForm } from "./profile-form";

export default async function OrganizationProfilePage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organization = await getOrganizationDetails(session, session.organizationId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Organization profile</h1>
        <p className="text-sm text-ink-muted">
          Public URL slug:{" "}
          <span className="font-mono text-ink">{organization.slug}</span> (fixed, cannot be
          changed).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <ProfileForm organization={organization} />
      </div>
    </div>
  );
}
