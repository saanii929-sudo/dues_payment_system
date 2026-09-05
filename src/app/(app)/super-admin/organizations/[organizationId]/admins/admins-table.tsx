"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { revokeOrgAdminAction } from "./actions";
import type { OrgAdminSummary } from "@/services/organization.service";

export function AdminsTable({
  admins,
  organizationId,
}: {
  admins: OrgAdminSummary[];
  organizationId: string;
}) {
  if (admins.length === 0) {
    return <p className="text-sm text-ink-muted">No admins assigned yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Assigned</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => (
          <TableRow key={admin.userRoleId}>
            <TableCell className="font-medium text-ink">{admin.fullName}</TableCell>
            <TableCell className="text-ink-muted">{admin.email}</TableCell>
            <TableCell className="text-ink-muted">
              {new Date(admin.assignedAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <ConfirmDialog
                trigger={
                  <Button variant="danger" size="sm">
                    Revoke
                  </Button>
                }
                title="Revoke this admin?"
                description={`${admin.fullName} will lose Organization Admin access immediately.`}
                confirmLabel="Revoke"
                confirmVariant="danger"
                onConfirm={() => revokeOrgAdminAction(admin.userRoleId, organizationId)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
