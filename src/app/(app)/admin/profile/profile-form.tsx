"use client";

import { useActionState } from "react";
import { updateOrganizationProfileAction, type UpdateProfileFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizationDetails } from "@/services/organization.service";

const initialState: UpdateProfileFormState = {};

export function ProfileForm({ organization }: { organization: OrganizationDetails }) {
  const [state, action, pending] = useActionState(updateOrganizationProfileAction, initialState);

  return (
    <form action={action} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" defaultValue={organization.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={organization.contactEmail}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input id="contactPhone" name="contactPhone" defaultValue={organization.contactPhone ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={organization.address ?? ""} />
      </div>
      {state?.error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-md bg-success-muted px-3 py-2 text-sm text-success">Saved.</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
