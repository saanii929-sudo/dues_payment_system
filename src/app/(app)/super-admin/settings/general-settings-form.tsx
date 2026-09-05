"use client";

import { useActionState } from "react";
import { updateGeneralSettingsAction, type GeneralSettingsFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlatformSettingsDTO } from "@/services/platform.service";

const initialState: GeneralSettingsFormState = {};

export function GeneralSettingsForm({ settings }: { settings: PlatformSettingsDTO }) {
  const [state, action, pending] = useActionState(updateGeneralSettingsAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="platformName">Platform name</Label>
        <Input
          id="platformName"
          name="platformName"
          defaultValue={settings.platformName}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="supportEmail">Support email</Label>
        <Input
          id="supportEmail"
          name="supportEmail"
          type="email"
          defaultValue={settings.supportEmail}
          required
        />
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
