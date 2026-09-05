import { Schema, model, models, type Document, type Types } from "mongoose";
import type { BasisPoints, PesewasAmount, RevenueBeneficiaryType } from "./shared/types";

export interface IRevenueAllocation extends Document {
  organizationId: Types.ObjectId;
  paymentId: Types.ObjectId;
  ruleId: Types.ObjectId;
  ruleNameSnapshot: string;
  beneficiaryType: RevenueBeneficiaryType;
  beneficiaryId?: Types.ObjectId;
  amountPesewas: PesewasAmount;
  percentageBpsSnapshot: BasisPoints;
  createdAt: Date;
}

const revenueAllocationSchema = new Schema<IRevenueAllocation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    ruleId: {
      type: Schema.Types.ObjectId,
      ref: "RevenueAllocationRule",
      required: true,
    },
    ruleNameSnapshot: { type: String, required: true },
    beneficiaryType: {
      type: String,
      required: true,
      enum: ["ORGANIZATION", "FACULTY", "DEPARTMENT"],
    },
    beneficiaryId: { type: Schema.Types.ObjectId },
    amountPesewas: { type: Number, required: true, min: 0 },
    percentageBpsSnapshot: { type: Number, required: true, min: 0, max: 10000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

revenueAllocationSchema.index(
  { paymentId: 1, beneficiaryType: 1, beneficiaryId: 1 },
  { unique: true },
);

export const RevenueAllocation =
  models.RevenueAllocation ??
  model<IRevenueAllocation>("RevenueAllocation", revenueAllocationSchema);
