"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChangeExecutiveRoleDialog } from "./change-executive-role-dialog";
import {
  removeDepartmentExecutiveAction,
  deactivateDepartmentExecutiveAccountAction,
  reactivateDepartmentExecutiveAccountAction,
} from "./actions";
import type { DepartmentExecutiveSummary } from "@/services/department-executive.service";

export function ExecutivesTable({
  departmentId,
  executives,
}: {
  departmentId: string;
  executives: DepartmentExecutiveSummary[];
}) {
  if (executives.length === 0) {
    return <p className="text-sm text-ink-muted">No officials assigned yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {executives.map((executive) => (
          <TableRow key={executive.userRoleId}>
            <TableCell className="text-ink-muted">{executive.role}</TableCell>
            <TableCell className="font-medium text-ink">{executive.fullName}</TableCell>
            <TableCell className="text-ink-muted">{executive.email}</TableCell>
            <TableCell>
              <Badge variant={executive.accountActive ? "success" : "danger"}>
                {executive.accountActive ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              <ChangeExecutiveRoleDialog departmentId={departmentId} executive={executive} />
              {executive.accountActive ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Deactivate
                    </Button>
                  }
                  title="Deactivate this account?"
                  description={`${executive.fullName} will be signed out immediately and unable to log in until reactivated.`}
                  confirmLabel="Deactivate"
                  confirmVariant="danger"
                  onConfirm={() =>
                    deactivateDepartmentExecutiveAccountAction(departmentId, executive.userId)
                  }
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Reactivate
                    </Button>
                  }
                  title="Reactivate this account?"
                  description={`${executive.fullName} will be able to log in again.`}
                  confirmLabel="Reactivate"
                  onConfirm={() =>
                    reactivateDepartmentExecutiveAccountAction(departmentId, executive.userId)
                  }
                />
              )}
              <ConfirmDialog
                trigger={
                  <Button variant="danger" size="sm">
                    Remove
                  </Button>
                }
                title="Remove this official?"
                description={`${executive.fullName} loses ${executive.role} access immediately. Their account and login stay intact.`}
                confirmLabel="Remove"
                confirmVariant="danger"
                onConfirm={() => removeDepartmentExecutiveAction(departmentId, executive.userRoleId)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
