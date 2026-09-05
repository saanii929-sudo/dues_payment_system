"use client";

import { useActionState } from "react";
import { createDepartmentAction, type CreateDepartmentFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FacultySummary } from "@/services/faculty.service";

const initialState: CreateDepartmentFormState = {};

export function DepartmentForm({ faculties }: { faculties: FacultySummary[] }) {
  const [state, action, pending] = useActionState(createDepartmentAction, initialState);

  if (faculties.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Add a faculty first — departments belong to a faculty.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="facultyId">Faculty</Label>
        <select
          id="facultyId"
          name="facultyId"
          required
          className="flex h-9 w-48 rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
        <Input id="name" name="name" required className="w-56" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" required className="w-32" placeholder="e.g. CS" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add department"}
      </Button>
      {state?.error && (
        <p className="w-full rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
