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

export type FacultyShareType = "FIXED" | "PERCENTAGE";

export interface IRevenueAllocationRule
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
  facultyShareType: FacultyShareType;
  facultyShareAmountPesewas?: PesewasAmount;
  facultyShareBps?: BasisPoints;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const revenueAllocationRuleSchema = new Schema<IRevenueAllocationRule>(
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
    facultyShareType: {
      type: String,
      required: true,
      enum: ["FIXED", "PERCENTAGE"],
    },
    facultyShareAmountPesewas: { type: Number, min: 0 },
    facultyShareBps: { type: Number, min: 0, max: 10000 },
    priority: { type: Number, required: true, default: 0 },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

revenueAllocationRuleSchema.index({ organizationId: 1, isActive: 1 });

export const RevenueAllocationRule =
  models.RevenueAllocationRule ??
  model<IRevenueAllocationRule>(
    "RevenueAllocationRule",
    revenueAllocationRuleSchema,
  );
