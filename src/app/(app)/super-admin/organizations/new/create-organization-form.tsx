"use client";

import { useActionState } from "react";
import { createOrganizationAction, type CreateOrganizationFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateOrganizationFormState = {};

export function CreateOrganizationForm() {
  const [state, action, pending] = useActionState(createOrganizationAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required placeholder="e.g. university-of-example" />
        <p className="text-xs text-ink-muted">
          Used in the public payment URL. Lowercase letters, numbers, and hyphens only.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input id="contactEmail" name="contactEmail" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contactPhone">Contact phone (optional)</Label>
        <Input id="contactPhone" name="contactPhone" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" name="address" />
      </div>
      {state?.error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
