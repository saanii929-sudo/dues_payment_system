"use client";

import { useActionState } from "react";
import { updatePaymentPeriodAction, type UpdatePaymentPeriodFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";

const initialState: UpdatePaymentPeriodFormState = {};

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function EditPaymentPeriodForm({ period }: { period: PaymentPeriodSummary }) {
  const boundAction = updatePaymentPeriodAction.bind(null, period.paymentPeriodId);
  const [state, action, pending] = useActionState(boundAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={period.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" required defaultValue={period.code} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="academicYear">Academic year</Label>
          <Input id="academicYear" name="academicYear" required defaultValue={period.academicYear} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={toDateInputValue(period.startDate)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={toDateInputValue(period.endDate)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paymentOpenDate">Payment opening date</Label>
          <Input
            id="paymentOpenDate"
            name="paymentOpenDate"
            type="date"
            required
            defaultValue={toDateInputValue(period.paymentOpenDate)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paymentCloseDate">Payment closing date</Label>
          <Input
            id="paymentCloseDate"
            name="paymentCloseDate"
            type="date"
            required
            defaultValue={toDateInputValue(period.paymentCloseDate)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" defaultValue={period.description ?? ""} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
      {state?.error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-md bg-success-muted px-3 py-2 text-sm text-success">Saved.</p>
      )}
    </form>
  );
}
