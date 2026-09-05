"use client";

import { useActionState } from "react";
import { createFacultyAction, type CreateFacultyFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateFacultyFormState = {};

export function FacultyForm() {
  const [state, action, pending] = useActionState(createFacultyAction, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Faculty name</Label>
        <Input id="name" name="name" required className="w-56" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" required className="w-32" placeholder="e.g. SCI" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add faculty"}
      </Button>
      {state?.error && (
        <p className="w-full rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
