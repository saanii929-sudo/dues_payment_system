"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { transitionPaymentPeriodStatusAction } from "./actions";
import type { PaymentPeriodStatus } from "@/services/payment-period.service";

// Type-only import above — this file is a Client Component, so it must never
// import a runtime value from payment-period.service.ts, which pulls in the
// server-only DB/auth guard.
const TRANSITION_COPY: Record<
  PaymentPeriodStatus,
  { label: string; title: string; description: string; variant: ButtonProps["variant"] }
> = {
  DRAFT: {
    label: "Revert to draft",
    title: "Revert this period to Draft?",
    description: "It will no longer be scheduled to go live.",
    variant: "secondary",
  },
  SCHEDULED: {
    label: "Schedule",
    title: "Schedule this period?",
    description: "It will be marked ready to go live once its payment window opens.",
    variant: "secondary",
  },
  ACTIVE: {
    label: "Activate",
    title: "Activate this period?",
    description:
      "It will become the organization's active payment period. Only one period can be active at a time.",
    variant: "primary",
  },
  CLOSED: {
    label: "Close",
    title: "Close this period?",
    description: "It will stop being the active payment period.",
    variant: "primary",
  },
  ARCHIVED: {
    label: "Archive",
    title: "Archive this period?",
    description: "It becomes historical record and can no longer be edited or reopened.",
    variant: "danger",
  },
};

export function PaymentPeriodStatusActions({
  paymentPeriodId,
  nextStatuses,
}: {
  paymentPeriodId: string;
  nextStatuses: PaymentPeriodStatus[];
}) {
  if (nextStatuses.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((status) => {
        const copy = TRANSITION_COPY[status];
        return (
          <ConfirmDialog
            key={status}
            trigger={<Button variant={copy.variant}>{copy.label}</Button>}
            title={copy.title}
            description={copy.description}
            confirmLabel={copy.label}
            confirmVariant={copy.variant}
            onConfirm={() => transitionPaymentPeriodStatusAction(paymentPeriodId, status)}
          />
        );
      })}
    </div>
  );
}
