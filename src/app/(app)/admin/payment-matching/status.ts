import type { badgeVariants } from "@/components/ui/badge";
import type { MatchingRowStatus } from "@/services/student-payment-matching.service";
import type { VariantProps } from "class-variance-authority";

export const MATCHING_STATUS_VARIANT: Record<MatchingRowStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  PAID: "success",
  UNPAID: "neutral",
  PENDING: "pending",
  FAILED: "danger",
  INVALID_INDEX_NUMBER: "danger",
};

export const MATCHING_STATUS_LABEL: Record<MatchingRowStatus, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  PENDING: "Pending",
  FAILED: "Failed",
  INVALID_INDEX_NUMBER: "Invalid Index Number",
};

export function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}
