import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PesewasAmount, SettlementMethod } from "./shared/types";

/** Append-only. At most one settlement per approved withdrawal request. */
export interface IWithdrawalSettlement extends Document {
  withdrawalRequestId: Types.ObjectId;
  settledById: Types.ObjectId;
  method: SettlementMethod;
  reference: string;
  amountPesewas: PesewasAmount;
  settledAt: Date;
  proofUrl?: string;
  createdAt: Date;
}

const withdrawalSettlementSchema = new Schema<IWithdrawalSettlement>(
  {
    withdrawalRequestId: {
      type: Schema.Types.ObjectId,
      ref: "WithdrawalRequest",
      required: true,
    },
    settledById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    method: {
      type: String,
      required: true,
      enum: ["BANK_TRANSFER", "MOBILE_MONEY", "HUBTEL_PAYOUT"],
    },
    reference: { type: String, required: true },
    amountPesewas: { type: Number, required: true, min: 0 },
    settledAt: { type: Date, required: true, default: Date.now },
    proofUrl: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

withdrawalSettlementSchema.index({ withdrawalRequestId: 1 }, { unique: true });

export const WithdrawalSettlement =
  models.WithdrawalSettlement ??
  model<IWithdrawalSettlement>("WithdrawalSettlement", withdrawalSettlementSchema);
