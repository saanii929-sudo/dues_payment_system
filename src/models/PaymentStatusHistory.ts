import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PaymentStatus } from "./shared/types";

export interface IPaymentStatusHistory extends Document {
  paymentId: Types.ObjectId;
  fromStatus?: PaymentStatus;
  toStatus: PaymentStatus;
  changedById?: Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

const paymentStatusHistorySchema = new Schema<IPaymentStatusHistory>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    fromStatus: {
      type: String,
      enum: ["PENDING", "SUCCESSFUL", "FAILED", "CANCELLED", "REFUNDED"],
    },
    toStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "SUCCESSFUL", "FAILED", "CANCELLED", "REFUNDED"],
    },
    changedById: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

paymentStatusHistorySchema.index({ paymentId: 1, createdAt: 1 });

export const PaymentStatusHistory =
  models.PaymentStatusHistory ??
  model<IPaymentStatusHistory>("PaymentStatusHistory", paymentStatusHistorySchema);
