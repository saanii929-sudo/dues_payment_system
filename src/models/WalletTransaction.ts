import { Schema, model, models, type Document, type Types } from "mongoose";
import type {
  PesewasAmount,
  WalletDirection,
  WalletTransactionSourceType,
  WalletType,
} from "./shared/types";

export interface IWalletTransaction extends Document {
  organizationId: Types.ObjectId;
  walletType: WalletType;
  walletId: Types.ObjectId;
  direction: WalletDirection;
  amountPesewas: PesewasAmount;
  balanceAfterPesewas: PesewasAmount;
  sourceType: WalletTransactionSourceType;
  sourceId: Types.ObjectId;
  description?: string;
  createdById?: Types.ObjectId;
  createdAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    walletType: { type: String, required: true, enum: ["FACULTY", "DEPARTMENT"] },
    walletId: { type: Schema.Types.ObjectId, required: true },
    direction: { type: String, required: true, enum: ["CREDIT", "DEBIT", "HOLD"] },
    amountPesewas: { type: Number, required: true, min: 0 },
    balanceAfterPesewas: { type: Number, required: true },
    sourceType: {
      type: String,
      required: true,
      enum: [
        "REVENUE_ALLOCATION",
        "WITHDRAWAL_HOLD",
        "WITHDRAWAL_RELEASE",
        "REFUND_REVERSAL",
        "ADJUSTMENT",
        "CORRECTION",
      ],
    },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    description: { type: String },
    createdById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

walletTransactionSchema.index(
  { walletType: 1, walletId: 1, sourceType: 1, sourceId: 1 },
  { unique: true },
);
walletTransactionSchema.index({ walletType: 1, walletId: 1, createdAt: 1 });

export const WalletTransaction =
  models.WalletTransaction ??
  model<IWalletTransaction>("WalletTransaction", walletTransactionSchema);
