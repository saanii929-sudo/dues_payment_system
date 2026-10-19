import type { badgeVariants } from "@/components/ui/badge";
import type { WithdrawalRequestStatus, WalletDirection, WalletTransactionSourceType } from "@/models";
import type { VariantProps } from "class-variance-authority";

export const WITHDRAWAL_STATUS_VARIANT: Record<
  WithdrawalRequestStatus,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  DRAFT: "neutral",
  PENDING_DEAN_APPROVAL: "pending",
  RETURNED_FOR_CORRECTION: "danger",
  DEAN_APPROVED: "info",
  DEAN_REJECTED: "danger",
  PENDING_SUPER_ADMIN_APPROVAL: "pending",
  SUPER_ADMIN_APPROVED: "info",
  RELEASED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalRequestStatus, string> = {
  DRAFT: "Draft",
  PENDING_DEAN_APPROVAL: "Pending first approval",
  RETURNED_FOR_CORRECTION: "Returned for correction",
  DEAN_APPROVED: "Approved — escalating",
  DEAN_REJECTED: "Rejected",
  PENDING_SUPER_ADMIN_APPROVAL: "Pending Super Admin approval",
  SUPER_ADMIN_APPROVED: "Approved — awaiting release",
  RELEASED: "Released",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}

/** The Approval Queue's "Current approval stage" column (Phase 21) — distinct from Status, which already names the specific state within a stage. */
export function approvalStageLabel(status: WithdrawalRequestStatus): string {
  switch (status) {
    case "PENDING_DEAN_APPROVAL":
    case "RETURNED_FOR_CORRECTION":
      return "First stage (Dean/HOD)";
    case "DEAN_APPROVED":
      return "Escalating to Super Admin";
    case "PENDING_SUPER_ADMIN_APPROVAL":
      return "Final stage (Super Admin)";
    default:
      return "—";
  }
}

/** The Wallet Transactions ledger's type column (Phase 22) — every `WalletTransactionSourceType` in the wallet's real vocabulary. */
export const WALLET_TRANSACTION_TYPE_LABEL: Record<WalletTransactionSourceType, string> = {
  REVENUE_ALLOCATION: "Revenue allocation",
  WITHDRAWAL_HOLD: "Withdrawal hold",
  WITHDRAWAL_RELEASE: "Withdrawal release",
  REFUND_REVERSAL: "Refund reversal",
  ADJUSTMENT: "Adjustment",
  CORRECTION: "Correction",
};

export const WALLET_DIRECTION_VARIANT: Record<WalletDirection, VariantProps<typeof badgeVariants>["variant"]> = {
  CREDIT: "success",
  DEBIT: "danger",
  HOLD: "pending",
};

export const WALLET_DIRECTION_LABEL: Record<WalletDirection, string> = {
  CREDIT: "Credit",
  DEBIT: "Debit",
  HOLD: "Hold",
};
