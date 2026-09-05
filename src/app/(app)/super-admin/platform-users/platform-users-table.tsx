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
import { deactivatePlatformUserAction, reactivatePlatformUserAction } from "./actions";
import type { PlatformUserSummary } from "@/services/platform.service";

export function PlatformUsersTable({ users }: { users: PlatformUserSummary[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-ink-muted">No users yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.userId}>
            <TableCell className="font-medium text-ink">{user.fullName}</TableCell>
            <TableCell className="text-ink-muted">{user.email}</TableCell>
            <TableCell className="text-ink-muted">{user.role ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{user.organizationName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={user.isActive ? "success" : "danger"}>
                {user.isActive ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {user.isActive ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      Deactivate
                    </Button>
                  }
                  title="Deactivate this account?"
                  description={`${user.fullName} will be signed out immediately and unable to log in until reactivated.`}
                  confirmLabel="Deactivate"
                  confirmVariant="danger"
                  onConfirm={() => deactivatePlatformUserAction(user.userId)}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Reactivate
                    </Button>
                  }
                  title="Reactivate this account?"
                  description={`${user.fullName} will be able to log in again.`}
                  confirmLabel="Reactivate"
                  onConfirm={() => reactivatePlatformUserAction(user.userId)}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
