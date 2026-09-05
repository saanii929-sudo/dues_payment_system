import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getOrganizationDetails } from "@/services/organization.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrganizationActions } from "./organization-actions";

export default async function OrganizationDetailsPage({
  params,
}: PageProps<"/super-admin/organizations/[organizationId]">) {
  const { organizationId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  const organization = await getOrganizationDetails(session, organizationId);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{organization.name}</h1>
          <p className="text-sm text-ink-muted">{organization.slug}</p>
        </div>
        <Badge variant={organization.isActive ? "success" : "danger"}>
          {organization.isActive ? "Active" : "Deactivated"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Faculties</p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{organization.facultyCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Departments
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{organization.departmentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Students</p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{organization.studentCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-muted">Contact email</dt>
          <dd className="text-ink">{organization.contactEmail}</dd>
          <dt className="text-ink-muted">Created</dt>
          <dd className="text-ink">{new Date(organization.createdAt).toLocaleDateString()}</dd>
        </dl>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/super-admin/organizations/${organization.organizationId}/admins`}>
            Manage admins
          </Link>
        </Button>
        <OrganizationActions
          organizationId={organization.organizationId}
          isActive={organization.isActive}
          organizationName={organization.name}
        />
      </div>
    </div>
  );
}
