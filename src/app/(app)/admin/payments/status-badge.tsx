import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { PaymentStatus } from "@/models";

// Type-only import above — kept consistent with every other status-badge in
// this app (Phase 8/9) in case this file ever ends up in a client bundle.
const STATUS_VARIANT: Record<PaymentStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  PENDING: "pending",
  SUCCESSFUL: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
  REFUNDED: "info",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  SUCCESSFUL: "Successful",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
