/** Integer minor currency unit (1 GHS = 100 pesewas). Never a float. */
export type PesewasAmount = number;

/** Integer basis points, 10000 = 100%. Never a float percentage. */
export type BasisPoints = number;

export type PaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";

export type WalletType = "FACULTY" | "DEPARTMENT";

export type WalletDirection = "CREDIT" | "DEBIT";

export type WalletTransactionSourceType =
  | "REVENUE_ALLOCATION"
  | "WITHDRAWAL_SETTLEMENT"
  | "REFUND_REVERSAL"
  | "ADJUSTMENT";

export type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SETTLED"
  | "CANCELLED";

export type WithdrawalDecision = "APPROVED" | "REJECTED";

export type SettlementMethod =
  | "BANK_TRANSFER"
  | "MOBILE_MONEY"
  | "HUBTEL_PAYOUT";

export type RefundStatus = "PENDING" | "APPROVED" | "PROCESSED" | "REJECTED";

export type StudentListUploadStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export type StudentListRowStatus = "VALID" | "INVALID" | "DUPLICATE";

export type StudentPaymentMatchStatus =
  | "MATCHED"
  | "UNMATCHED"
  | "MANUAL_OVERRIDE";

export type NotificationChannel = "EMAIL" | "SMS";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export type RevenueBeneficiaryType = "ORGANIZATION" | "FACULTY" | "DEPARTMENT";

/** Snapshot of a student's roster context at the moment a payment was made. */
export interface StudentSnapshot {
  fullName: string;
  facultyId?: string;
  facultyName?: string;
  departmentId?: string;
  departmentName?: string;
  academicLevelId?: string;
  academicLevelName?: string;
  studentCategoryId?: string;
  studentCategoryName?: string;
}
