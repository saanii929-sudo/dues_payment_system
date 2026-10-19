import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PesewasAmount } from "./shared/types";

export type RevenueAllocationStatus = "ALLOCATED" | "REVERSED" | "ADJUSTED";

export interface IRevenueAllocation extends Document {
  organizationId: Types.ObjectId;
  paymentId: Types.ObjectId;
  studentIndexNumber: string;
  facultyId?: Types.ObjectId;
  facultyName?: string;
  departmentId?: Types.ObjectId;
  departmentName?: string;
  studentCategoryId?: Types.ObjectId;
  studentCategoryName?: string;
  academicLevelId?: Types.ObjectId;
  academicLevelName?: string;
  paymentPeriodId: Types.ObjectId;
  paymentPeriodName: string;
  totalAmountPesewas: PesewasAmount;
  facultyShareAmountPesewas: PesewasAmount;
  departmentShareAmountPesewas: PesewasAmount;
  deductionsTotalPesewas: PesewasAmount;
  ruleId: Types.ObjectId;
  ruleNameSnapshot: string;
  status: RevenueAllocationStatus;
  isCorrection: boolean;
  adjustsEntryId?: Types.ObjectId;
  adjustmentReason?: string;
  createdAt: Date;
}

const revenueAllocationSchema = new Schema<IRevenueAllocation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    studentIndexNumber: { type: String, required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    departmentName: { type: String },
    studentCategoryId: { type: Schema.Types.ObjectId, ref: "StudentCategory" },
    studentCategoryName: { type: String },
    academicLevelId: { type: Schema.Types.ObjectId, ref: "AcademicLevel" },
    academicLevelName: { type: String },
    paymentPeriodId: { type: Schema.Types.ObjectId, ref: "PaymentPeriod", required: true },
    paymentPeriodName: { type: String, required: true },
    totalAmountPesewas: { type: Number, required: true, min: 0 },
    facultyShareAmountPesewas: { type: Number, required: true, min: 0 },
    departmentShareAmountPesewas: { type: Number, required: true, min: 0 },
    deductionsTotalPesewas: { type: Number, required: true, min: 0, default: 0 },
    ruleId: { type: Schema.Types.ObjectId, ref: "RevenueAllocationRule", required: true },
    ruleNameSnapshot: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["ALLOCATED", "REVERSED", "ADJUSTED"],
      default: "ALLOCATED",
    },
    isCorrection: { type: Boolean, required: true, default: false },
    adjustsEntryId: { type: Schema.Types.ObjectId, ref: "RevenueAllocation" },
    adjustmentReason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

revenueAllocationSchema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { isCorrection: false } },
);
revenueAllocationSchema.index({ organizationId: 1, status: 1 });
revenueAllocationSchema.index({ paymentId: 1, status: 1 });

export const RevenueAllocation =
  models.RevenueAllocation ??
  model<IRevenueAllocation>("RevenueAllocation", revenueAllocationSchema);
