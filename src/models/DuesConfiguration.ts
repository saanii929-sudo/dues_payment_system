import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import type { PesewasAmount } from "./shared/types";

export type DuesConfigurationStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface IDuesConfiguration extends Document, AuditFields {
  organizationId: Types.ObjectId;
  paymentPeriodId: Types.ObjectId;
  name: string;
  code: string;
  amountPesewas: PesewasAmount;
  effectiveDate: Date;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  academicLevelId?: Types.ObjectId;
  studentCategoryId?: Types.ObjectId;
  isMandatory: boolean;
  status: DuesConfigurationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const duesConfigurationSchema = new Schema<IDuesConfiguration>(
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
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    amountPesewas: { type: Number, required: true, min: 0 },
    effectiveDate: { type: Date, required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    academicLevelId: { type: Schema.Types.ObjectId, ref: "AcademicLevel" },
    studentCategoryId: { type: Schema.Types.ObjectId, ref: "StudentCategory" },
    isMandatory: { type: Boolean, default: true },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
      default: "DRAFT",
    },
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

duesConfigurationSchema.index(
  { organizationId: 1, paymentPeriodId: 1, code: 1 },
  { unique: true },
);
duesConfigurationSchema.index({ organizationId: 1, status: 1 });

export const DuesConfiguration =
  models.DuesConfiguration ??
  model<IDuesConfiguration>("DuesConfiguration", duesConfigurationSchema);
