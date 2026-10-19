"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { refundPaymentAction } from "./actions";

/**
 * The only status-affecting action anywhere in the Phase 12 admin surface —
 * and it only ever operates on an already-`SUCCESSFUL` payment, reversing a
 * confirmed payment through the real gateway (`processRefund`, Phase 11),
 * never fabricating a confirmation. See ARCHITECTURE.md Phase 12.
 */
export function RefundAction({ paymentId, label = "Refund" }: { paymentId: string; label?: string }) {
  return (
    <EditDialog
      trigger={
        <Button variant="danger" size="sm">
          {label}
        </Button>
      }
      title="Refund this payment?"
      description="This calls the real payment gateway and reverses any faculty/department allocations it made. This cannot be undone."
      submitLabel="Refund"
      submitVariant="danger"
      onSubmit={(formData) => refundPaymentAction(paymentId, formData)}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`refund-reason-${paymentId}`}>Reason</Label>
        <Textarea id={`refund-reason-${paymentId}`} name="reason" required placeholder="Why is this payment being refunded?" />
      </div>
    </EditDialog>
  );
}
