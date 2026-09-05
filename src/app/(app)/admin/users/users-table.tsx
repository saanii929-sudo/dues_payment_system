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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deactivateUserAction, reactivateUserAction, revokeRoleAction } from "./actions";
import type { RoleAssignmentSummary } from "@/services/role-assignment.service";

export function UsersTable({ assignments }: { assignments: RoleAssignmentSummary[] }) {
  if (assignments.length === 0) {
    return <p className="text-sm text-ink-muted">No users found in this organization.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => (
          <TableRow key={assignment.userRoleId}>
            <TableCell className="font-medium text-ink">{assignment.fullName}</TableCell>
            <TableCell className="text-ink-muted">{assignment.email}</TableCell>
            <TableCell className="text-ink-muted">{assignment.role}</TableCell>
            <TableCell className="text-ink-muted">
              {assignment.departmentName ?? assignment.facultyName ?? "Organization"}
            </TableCell>
            <TableCell>
              <Badge variant={assignment.isActive ? "success" : "danger"}>
                {assignment.isActive ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1.5">
                {assignment.isActive ? (
                  <ConfirmDialog
                    trigger={
                      <Button variant="danger" size="sm">
                        Deactivate
                      </Button>
                    }
                    title="Deactivate this account?"
                    description={`${assignment.fullName} will be signed out immediately and unable to log in until reactivated.`}
                    confirmLabel="Deactivate"
                    confirmVariant="danger"
                    onConfirm={() => deactivateUserAction(assignment.userId)}
                  />
                ) : (
                  <ConfirmDialog
                    trigger={
                      <Button variant="secondary" size="sm">
                        Reactivate
                      </Button>
                    }
                    title="Reactivate this account?"
                    description={`${assignment.fullName} will be able to log in again.`}
                    confirmLabel="Reactivate"
                    onConfirm={() => reactivateUserAction(assignment.userId)}
                  />
                )}
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Revoke role
                    </Button>
                  }
                  title="Revoke this role?"
                  description={`${assignment.fullName} will lose ${assignment.role} access immediately. Their account stays, without an active role.`}
                  confirmLabel="Revoke"
                  confirmVariant="danger"
                  onConfirm={() => revokeRoleAction(assignment.userRoleId)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
