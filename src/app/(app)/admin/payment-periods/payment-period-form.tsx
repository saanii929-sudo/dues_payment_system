"use client";

import { useActionState } from "react";
import { createPaymentPeriodAction, type CreatePaymentPeriodFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: CreatePaymentPeriodFormState = {};

export function PaymentPeriodForm() {
  const [state, action, pending] = useActionState(createPaymentPeriodAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="e.g. First Semester" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" required placeholder="e.g. 2026-S1" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="academicYear">Academic year</Label>
          <Input id="academicYear" name="academicYear" required placeholder="e.g. 2026/2027" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paymentOpenDate">Payment opening date</Label>
          <Input id="paymentOpenDate" name="paymentOpenDate" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paymentCloseDate">Payment closing date</Label>
          <Input id="paymentCloseDate" name="paymentCloseDate" type="date" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" placeholder="Internal notes about this period" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add period"}
      </Button>
      {state?.error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}
