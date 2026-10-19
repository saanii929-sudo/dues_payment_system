"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ROLES } from "@/lib/permissions/roles";
import { changeFacultyExecutiveRoleAction } from "./actions";
import type { FacultyExecutiveSummary } from "@/services/faculty-executive.service";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ChangeExecutiveRoleDialog({
  facultyId,
  executive,
}: {
  facultyId: string;
  executive: FacultyExecutiveSummary;
}) {
  return (
    <EditDialog
      trigger={
        <Button variant="secondary" size="sm">
          Change role
        </Button>
      }
      title={`Change ${executive.fullName}'s role`}
      description="The current assignment is revoked and a new one is created — the change is preserved in the executive history below."
      submitLabel="Save"
      onSubmit={(formData) =>
        changeFacultyExecutiveRoleAction(facultyId, executive.userRoleId, formData)
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
          <option value={ROLES.FACULTY_DEAN}>Faculty Dean</option>
          <option value={ROLES.FACULTY_PRESIDENT}>Faculty President</option>
          <option value={ROLES.FACULTY_TREASURER}>Faculty Treasurer</option>
        </select>
      </div>
    </EditDialog>
  );
}
