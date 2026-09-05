import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PaymentStatus, PesewasAmount, StudentSnapshot } from "./shared/types";

export interface IPayment extends Document {
  organizationId: Types.ObjectId;
  paymentPeriodId: Types.ObjectId;
  duesConfigurationId: Types.ObjectId;
  studentIndexNumber: string;
  studentSnapshot: StudentSnapshot;
  amountPesewas: PesewasAmount;
  currency: string;
  provider: string;
  providerReference?: string;
  clientReference: string;
  status: PaymentStatus;
  paidAt?: Date;
  receiptNumber?: string;
  rawProviderPayload?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const studentSnapshotSchema = new Schema(
  {
    fullName: { type: String, required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    departmentName: { type: String },
    academicLevelId: { type: Schema.Types.ObjectId, ref: "AcademicLevel" },
    academicLevelName: { type: String },
    studentCategoryId: { type: Schema.Types.ObjectId, ref: "StudentCategory" },
    studentCategoryName: { type: String },
  },
  { _id: false },
);

const paymentSchema = new Schema<IPayment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    paymentPeriodId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentPeriod",
      required: true,
    },
    duesConfigurationId: {
      type: Schema.Types.ObjectId,
      ref: "DuesConfiguration",
      required: true,
    },
    studentIndexNumber: { type: String, required: true, trim: true },
    studentSnapshot: { type: studentSnapshotSchema, required: true },
    amountPesewas: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "GHS" },
    provider: { type: String, required: true, default: "HUBTEL" },
    providerReference: { type: String },
    clientReference: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    paidAt: { type: Date },
    receiptNumber: { type: String },
    rawProviderPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

paymentSchema.index({ clientReference: 1 }, { unique: true });
paymentSchema.index(
  { providerReference: 1 },
  { unique: true, sparse: true },
);
paymentSchema.index({ organizationId: 1, status: 1 });
paymentSchema.index({ organizationId: 1, studentIndexNumber: 1 });

export const Payment = models.Payment ?? model<IPayment>("Payment", paymentSchema);
