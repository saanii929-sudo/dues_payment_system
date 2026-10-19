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
  removeFacultyExecutiveAction,
  deactivateFacultyExecutiveAccountAction,
  reactivateFacultyExecutiveAccountAction,
} from "./actions";
import type { FacultyExecutiveSummary } from "@/services/faculty-executive.service";

export function ExecutivesTable({
  facultyId,
  executives,
}: {
  facultyId: string;
  executives: FacultyExecutiveSummary[];
}) {
  if (executives.length === 0) {
    return <p className="text-sm text-ink-muted">No executives assigned yet.</p>;
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
              <ChangeExecutiveRoleDialog facultyId={facultyId} executive={executive} />
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
                    deactivateFacultyExecutiveAccountAction(facultyId, executive.userId)
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
                    reactivateFacultyExecutiveAccountAction(facultyId, executive.userId)
                  }
                />
              )}
              <ConfirmDialog
                trigger={
                  <Button variant="danger" size="sm">
                    Remove
                  </Button>
                }
                title="Remove this executive?"
                description={`${executive.fullName} loses ${executive.role} access immediately. Their account and login stay intact.`}
                confirmLabel="Remove"
                confirmVariant="danger"
                onConfirm={() => removeFacultyExecutiveAction(facultyId, executive.userRoleId)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
