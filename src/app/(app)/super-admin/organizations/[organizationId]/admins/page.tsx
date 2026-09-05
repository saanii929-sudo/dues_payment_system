import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listOrgAdmins } from "@/services/organization.service";
import { AdminsTable } from "./admins-table";
import { AddAdminForm } from "./add-admin-form";

export default async function OrganizationAdminsPage({
  params,
}: PageProps<"/super-admin/organizations/[organizationId]/admins">) {
  const { organizationId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  const admins = await listOrgAdmins(session, organizationId);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Organization admins</h1>
        <p className="text-sm text-ink-muted">Manage who has Organization Admin access.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <AdminsTable admins={admins} organizationId={organizationId} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Add an admin</h2>
        <div className="mt-4">
          <AddAdminForm organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
}
