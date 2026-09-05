"use client";

import { useActionState } from "react";
import { assignOrgAdminAction, type AssignAdminFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AssignAdminFormState = {};

export function AddAdminForm({ organizationId }: { organizationId: string }) {
  const boundAction = assignOrgAdminAction.bind(null, organizationId);
  const [state, action, pending] = useActionState(boundAction, initialState);

  if (state?.success) {
    return (
      <p className="rounded-md bg-success-muted px-3 py-2 text-sm text-success">
        Admin added. A password-setup link has been sent (check the server console in
        development).
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      {state?.error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add admin"}
      </Button>
    </form>
  );
}
