"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ROLES } from "@/lib/permissions/roles";
import { changeDepartmentExecutiveRoleAction } from "./actions";
import type { DepartmentExecutiveSummary } from "@/services/department-executive.service";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ChangeExecutiveRoleDialog({
  departmentId,
  executive,
}: {
  departmentId: string;
  executive: DepartmentExecutiveSummary;
}) {
  return (
    <EditDialog
      trigger={
        <Button variant="secondary" size="sm">
          Change role
        </Button>
      }
      title={`Change ${executive.fullName}'s role`}
      description="The current assignment is revoked and a new one is created — the change is preserved in the appointment history below."
      submitLabel="Save"
      onSubmit={(formData) =>
        changeDepartmentExecutiveRoleAction(departmentId, executive.userRoleId, formData)
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor={`role-${executive.userRoleId}`}>New role</Label>
        <select
          id={`role-${executive.userRoleId}`}
          name="role"
          required
          className={selectClassName}
          defaultValue={executive.role}
        >
          <option value={ROLES.DEPT_HOD}>Head of Department</option>
          <option value={ROLES.DEPT_PRESIDENT}>Department President</option>
          <option value={ROLES.DEPT_TREASURER}>Department Treasurer</option>
        </select>
      </div>
    </EditDialog>
  );
}
