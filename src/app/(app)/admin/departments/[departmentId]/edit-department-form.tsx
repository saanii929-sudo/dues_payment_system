"use client";

import { useActionState } from "react";
import { updateDepartmentAction, type UpdateDepartmentFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DepartmentDetails } from "@/services/department.service";
import type { FacultySummary } from "@/services/faculty.service";

const initialState: UpdateDepartmentFormState = {};

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function EditDepartmentForm({
  department,
  faculties,
}: {
  department: DepartmentDetails;
  faculties: FacultySummary[];
}) {
  const boundAction = updateDepartmentAction.bind(null, department.departmentId);
  const [state, action, pending] = useActionState(boundAction, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="facultyId">Faculty</Label>
        <select
          id="facultyId"
          name="facultyId"
          required
          defaultValue={department.facultyId}
          className={selectClassName + " w-48"}
        >
          {faculties.map((faculty) => (
            <option key={faculty.facultyId} value={faculty.facultyId}>
              {faculty.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Department name</Label>
        <Input id="name" name="name" defaultValue={department.name} required className="w-56" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" defaultValue={department.code} required className="w-32" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
      {state?.error && (
        <p className="w-full rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="w-full rounded-md bg-success-muted px-3 py-2 text-sm text-success">
          Saved.
        </p>
      )}
    </form>
  );
}
