import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listAllUsers } from "@/services/platform.service";
import { PlatformUsersTable } from "./platform-users-table";

export default async function PlatformUsersPage() {
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  const users = await listAllUsers(session);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Platform users</h1>
        <p className="text-sm text-ink-muted">Every user account across every organization.</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <PlatformUsersTable users={users} />
      </div>
    </div>
  );
}
