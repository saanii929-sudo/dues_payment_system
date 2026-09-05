"use client";

import { useActionState } from "react";
import { updateFacultyAction, type UpdateFacultyFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FacultyDetails } from "@/services/faculty.service";

const initialState: UpdateFacultyFormState = {};

export function EditFacultyForm({ faculty }: { faculty: FacultyDetails }) {
  const boundAction = updateFacultyAction.bind(null, faculty.facultyId);
  const [state, action, pending] = useActionState(boundAction, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Faculty name</Label>
        <Input id="name" name="name" defaultValue={faculty.name} required className="w-56" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" defaultValue={faculty.code} required className="w-32" />
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
