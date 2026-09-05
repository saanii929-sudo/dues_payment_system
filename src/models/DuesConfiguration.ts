import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";
import type { PesewasAmount } from "./shared/types";

export interface IDuesConfiguration
  extends Document,
    AuditFields,
    DeactivationFields {
  organizationId: Types.ObjectId;
  paymentPeriodId: Types.ObjectId;
  name: string;
  code: string;
  amountPesewas: PesewasAmount;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  academicLevelId?: Types.ObjectId;
  studentCategoryId?: Types.ObjectId;
  isMandatory: boolean;
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
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    academicLevelId: { type: Schema.Types.ObjectId, ref: "AcademicLevel" },
    studentCategoryId: { type: Schema.Types.ObjectId, ref: "StudentCategory" },
    isMandatory: { type: Boolean, default: true },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

duesConfigurationSchema.index(
  { organizationId: 1, paymentPeriodId: 1, code: 1 },
  { unique: true },
);
duesConfigurationSchema.index({ organizationId: 1, isActive: 1 });

export const DuesConfiguration =
  models.DuesConfiguration ??
  model<IDuesConfiguration>("DuesConfiguration", duesConfigurationSchema);
