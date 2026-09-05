import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PesewasAmount, WalletType, WithdrawalStatus } from "./shared/types";

export interface IWithdrawalRequest extends Document {
  organizationId: Types.ObjectId;
  walletType: WalletType;
  walletId: Types.ObjectId;
  requestedById: Types.ObjectId;
  amountPesewas: PesewasAmount;
  reason: string;
  status: WithdrawalStatus;
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
    requestedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountPesewas: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "APPROVED", "REJECTED", "SETTLED", "CANCELLED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

withdrawalRequestSchema.index({ organizationId: 1, status: 1 });
withdrawalRequestSchema.index({ walletType: 1, walletId: 1 });

export const WithdrawalRequest =
  models.WithdrawalRequest ??
  model<IWithdrawalRequest>("WithdrawalRequest", withdrawalRequestSchema);
