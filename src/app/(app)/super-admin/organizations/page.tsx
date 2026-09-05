import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listOrganizations } from "@/services/organization.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default async function OrganizationsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  const organizations = await listOrganizations(session);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">Organizations</h1>
          <p className="text-sm text-ink-muted">Every tenant on the platform.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/super-admin/organizations/new">New organization</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        {organizations.length === 0 ? (
          <p className="text-sm text-ink-muted">No organizations yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.organizationId}>
                  <TableCell className="font-medium text-ink">{org.name}</TableCell>
                  <TableCell className="text-ink-muted">{org.slug}</TableCell>
                  <TableCell className="text-ink-muted">{org.contactEmail}</TableCell>
                  <TableCell>
                    <Badge variant={org.isActive ? "success" : "danger"}>
                      {org.isActive ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/super-admin/organizations/${org.organizationId}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
