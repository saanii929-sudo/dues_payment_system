"use client";

import { useActionState } from "react";
import { updatePaymentConfigAction, type PaymentConfigFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlatformSettingsDTO } from "@/services/platform.service";

const initialState: PaymentConfigFormState = {};

export function PaymentConfigForm({ settings }: { settings: PlatformSettingsDTO }) {
  const [state, action, pending] = useActionState(updatePaymentConfigAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="paymentEnvironment">Environment</Label>
        <select
          id="paymentEnvironment"
          name="paymentEnvironment"
          defaultValue={settings.paymentEnvironment}
          className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <option value="SANDBOX">Sandbox</option>
          <option value="LIVE">Live</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="defaultCurrency">Default currency</Label>
        <Input
          id="defaultCurrency"
          name="defaultCurrency"
          defaultValue={settings.defaultCurrency}
          maxLength={3}
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="cardPaymentsEnabled"
          name="cardPaymentsEnabled"
          defaultChecked={settings.cardPaymentsEnabled}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="cardPaymentsEnabled">Card payments enabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="mobileMoneyEnabled"
          name="mobileMoneyEnabled"
          defaultChecked={settings.mobileMoneyEnabled}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="mobileMoneyEnabled">Mobile money enabled</Label>
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
