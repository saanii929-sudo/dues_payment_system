import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";
import type { BasisPoints, RevenueBeneficiaryType } from "./shared/types";

export interface IRevenueSplit {
  beneficiaryType: RevenueBeneficiaryType;
  percentageBps: BasisPoints;
}

export interface IRevenueAllocationRule
  extends Document,
    AuditFields,
    DeactivationFields {
  organizationId: Types.ObjectId;
  name: string;
  appliesToFacultyId?: Types.ObjectId;
  appliesToDepartmentId?: Types.ObjectId;
  splits: IRevenueSplit[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const revenueSplitSchema = new Schema<IRevenueSplit>(
  {
    beneficiaryType: {
      type: String,
      required: true,
      enum: ["ORGANIZATION", "FACULTY", "DEPARTMENT"],
    },
    percentageBps: { type: Number, required: true, min: 0, max: 10000 },
  },
  { _id: false },
);

const revenueAllocationRuleSchema = new Schema<IRevenueAllocationRule>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    appliesToFacultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    appliesToDepartmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    splits: {
      type: [revenueSplitSchema],
      required: true,
      validate: {
        validator: (splits: IRevenueSplit[]) =>
          splits.reduce((sum, split) => sum + split.percentageBps, 0) === 10000,
        message: "Revenue split percentages must sum to 10000 basis points (100%).",
      },
    },
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
