import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { RevenueAllocationStatus } from "@/models";

const STATUS_VARIANT: Record<RevenueAllocationStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  ALLOCATED: "success",
  REVERSED: "danger",
  ADJUSTED: "neutral",
};

const STATUS_LABEL: Record<RevenueAllocationStatus, string> = {
  ALLOCATED: "Allocated",
  REVERSED: "Reversed",
  ADJUSTED: "Adjusted",
};

export function LedgerStatusBadge({ status }: { status: RevenueAllocationStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
