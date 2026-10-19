import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PesewasAmount, RefundStatus } from "./shared/types";

export interface IRefund extends Document {
  organizationId: Types.ObjectId;
  paymentId: Types.ObjectId;
  requestedById: Types.ObjectId;
  amountPesewas: PesewasAmount;
  reason: string;
  status: RefundStatus;
  processedReference?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    requestedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountPesewas: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "APPROVED", "PROCESSED", "REJECTED"],
      default: "PENDING",
    },
    processedReference: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

refundSchema.index({ paymentId: 1 });

export const Refund = models.Refund ?? model<IRefund>("Refund", refundSchema);
