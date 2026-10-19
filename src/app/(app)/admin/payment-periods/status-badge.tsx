import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { PaymentPeriodStatus } from "@/services/payment-period.service";

// Type-only import above — this file is bundled into the client (used by the
// client-rendered table), so it must never import a runtime value from
// payment-period.service.ts, which pulls in the server-only DB/auth guard.
const STATUS_VARIANT: Record<PaymentPeriodStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  DRAFT: "neutral",
  SCHEDULED: "info",
  ACTIVE: "success",
  CLOSED: "pending",
  ARCHIVED: "danger",
};

const STATUS_LABEL: Record<PaymentPeriodStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export function PaymentPeriodStatusBadge({ status }: { status: PaymentPeriodStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
