import { connectToDatabase } from "@/lib/db/connection";
import { Organization } from "@/models";
import { ROLES } from "@/lib/permissions/roles";
import type { SessionUser } from "@/lib/permissions/roles";

/**
 * Shows the current organization's real name as a static label, not a
 * dropdown with nothing to select — no user in this schema belongs to more
 * than one organization. Becomes a real switcher once Phase 4 ships org
 * management for Super Admin. See ARCHITECTURE.md "Org switcher is honest".
 */
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
