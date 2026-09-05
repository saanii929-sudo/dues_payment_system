"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type RequestResetFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RequestResetFormState = {};

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state?.submitted) {
    return (
      <p className="text-sm text-ink-muted">
        If an account exists for that email, a password reset link has been sent.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {state?.error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
