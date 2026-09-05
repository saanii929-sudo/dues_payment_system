"use client";

import { useActionState } from "react";
import { createPaymentPeriodAction, type CreatePaymentPeriodFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreatePaymentPeriodFormState = {};

export function PaymentPeriodForm() {
  const [state, action, pending] = useActionState(createPaymentPeriodAction, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          className="w-56"
          placeholder="e.g. 2024/2025 - Semester 1"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" required className="w-32" placeholder="e.g. 2024-S1" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startDate">Start date</Label>
        <Input id="startDate" name="startDate" type="date" required className="w-40" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endDate">End date</Label>
        <Input id="endDate" name="endDate" type="date" required className="w-40" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add period"}
      </Button>
      {state?.error && (
        <p className="w-full rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
