import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";
import type { BasisPoints, PesewasAmount } from "./shared/types";

export type DeductionType = "FIXED" | "PERCENTAGE";
export type RevenueDeductionStatus = "DRAFT" | "APPROVED" | "ARCHIVED";

export interface IRevenueDeduction
  extends Document,
    AuditFields,
    DeactivationFields {
  organizationId: Types.ObjectId;
  name: string;
  paymentPeriodId?: Types.ObjectId;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  academicLevelId?: Types.ObjectId;
  studentCategoryId?: Types.ObjectId;
  deductionType: DeductionType;
  amountPesewas?: PesewasAmount;
  percentageBps?: BasisPoints;
  status: RevenueDeductionStatus;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const revenueDeductionSchema = new Schema<IRevenueDeduction>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    paymentPeriodId: { type: Schema.Types.ObjectId, ref: "PaymentPeriod" },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    academicLevelId: { type: Schema.Types.ObjectId, ref: "AcademicLevel" },
    studentCategoryId: { type: Schema.Types.ObjectId, ref: "StudentCategory" },
    deductionType: {
      type: String,
      required: true,
      enum: ["FIXED", "PERCENTAGE"],
    },
    amountPesewas: { type: Number, min: 0 },
    percentageBps: { type: Number, min: 0, max: 10000 },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "APPROVED", "ARCHIVED"],
      default: "DRAFT",
    },
    priority: { type: Number, required: true, default: 0 },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

revenueDeductionSchema.index({ organizationId: 1, status: 1 });

export const RevenueDeduction =
  models.RevenueDeduction ?? model<IRevenueDeduction>("RevenueDeduction", revenueDeductionSchema);
