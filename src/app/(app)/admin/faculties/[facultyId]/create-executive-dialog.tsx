"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES } from "@/lib/permissions/roles";
import { createFacultyExecutiveAction } from "./actions";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function CreateExecutiveDialog({ facultyId }: { facultyId: string }) {
  return (
    <EditDialog
      trigger={<Button size="sm">New executive</Button>}
      title="New faculty executive"
      description="Sends a password-setup link to the person's email."
      submitLabel="Create"
      onSubmit={(formData) => createFacultyExecutiveAction(facultyId, formData)}
    >
      <div className="space-y-1.5">
        <Label htmlFor="exec-fullName">Full name</Label>
        <Input id="exec-fullName" name="fullName" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="exec-email">Email</Label>
        <Input id="exec-email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="exec-role">Role</Label>
        <select id="exec-role" name="role" required className={selectClassName} defaultValue={ROLES.FACULTY_TREASURER}>
          <option value={ROLES.FACULTY_DEAN}>Faculty Dean</option>
          <option value={ROLES.FACULTY_PRESIDENT}>Faculty President</option>
          <option value={ROLES.FACULTY_TREASURER}>Faculty Treasurer</option>
        </select>
      </div>
    </EditDialog>
  );
}
