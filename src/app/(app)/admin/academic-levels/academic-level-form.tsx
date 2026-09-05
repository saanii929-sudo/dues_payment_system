"use client";

import { useActionState } from "react";
import { createAcademicLevelAction, type CreateAcademicLevelFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateAcademicLevelFormState = {};

export function AcademicLevelForm() {
  const [state, action, pending] = useActionState(createAcademicLevelAction, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required className="w-40" placeholder="e.g. 100 Level" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" required className="w-28" placeholder="e.g. 100" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sortOrder">Sort order</Label>
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={0}
          className="w-24"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add level"}
      </Button>
      {state?.error && (
        <p className="w-full rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
