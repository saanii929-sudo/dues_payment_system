import { connectToDatabase } from "@/lib/db/connection";
import { Organization } from "@/models";
import { ROLES } from "@/lib/permissions/roles";
import type { SessionUser } from "@/lib/permissions/roles";

export async function OrgIdentity({ user }: { user: SessionUser }) {
  if (user.role === ROLES.SUPER_ADMIN || !user.organizationId) {
    return (
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-ink">Platform</p>
        <p className="text-xs text-ink-muted">Super Admin</p>
      </div>
    );
  }

  await connectToDatabase();
  const organization = await Organization.findById(user.organizationId);

  return (
    <div className="px-3 py-2.5">
      <p className="truncate text-sm font-semibold text-ink">
        {organization?.name ?? "Organization"}
      </p>
      <p className="text-xs text-ink-muted">Organization</p>
    </div>
  );
}
