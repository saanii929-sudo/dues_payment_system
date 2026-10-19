import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PesewasAmount, WalletType } from "./shared/types";

export type WithdrawalRequestStatus =
  | "DRAFT"
  | "PENDING_DEAN_APPROVAL"
  | "RETURNED_FOR_CORRECTION"
  | "DEAN_APPROVED"
  | "DEAN_REJECTED"
  | "PENDING_SUPER_ADMIN_APPROVAL"
  | "SUPER_ADMIN_APPROVED"
  | "RELEASED"
  | "REJECTED"
  | "CANCELLED";

export type WithdrawalDestinationMethod = "BANK_TRANSFER" | "MOBILE_MONEY";

export interface IWithdrawalRequest extends Document {
  organizationId: Types.ObjectId;
  walletType: WalletType;
  walletId: Types.ObjectId;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  requestedById: Types.ObjectId;
  amountPesewas: PesewasAmount;
  reason: string;
  destinationMethod: WithdrawalDestinationMethod;
  destinationAccountName: string;
  destinationAccountNumber: string;
  destinationProvider: string;
  status: WithdrawalRequestStatus;
  correctionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    walletType: { type: String, required: true, enum: ["FACULTY", "DEPARTMENT"] },
    walletId: { type: Schema.Types.ObjectId, required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    requestedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountPesewas: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    destinationMethod: { type: String, required: true, enum: ["BANK_TRANSFER", "MOBILE_MONEY"] },
    destinationAccountName: { type: String, required: true, trim: true },
    destinationAccountNumber: { type: String, required: true, trim: true },
    destinationProvider: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: [
        "DRAFT",
        "PENDING_DEAN_APPROVAL",
        "RETURNED_FOR_CORRECTION",
        "DEAN_APPROVED",
        "DEAN_REJECTED",
        "PENDING_SUPER_ADMIN_APPROVAL",
        "SUPER_ADMIN_APPROVED",
        "RELEASED",
        "REJECTED",
        "CANCELLED",
      ],
      default: "DRAFT",
    },
    correctionNote: { type: String },
  },
  { timestamps: true },
);

withdrawalRequestSchema.index({ organizationId: 1, status: 1 });
withdrawalRequestSchema.index({ walletType: 1, walletId: 1, status: 1 });
withdrawalRequestSchema.index({ facultyId: 1 });
withdrawalRequestSchema.index({ departmentId: 1 });

export const WithdrawalRequest =
  models.WithdrawalRequest ??
  model<IWithdrawalRequest>("WithdrawalRequest", withdrawalRequestSchema);
