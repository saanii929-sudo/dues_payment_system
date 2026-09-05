import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";

export interface IStudentCategory
  extends Document,
    AuditFields,
    DeactivationFields {
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const studentCategorySchema = new Schema<IStudentCategory>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    sortOrder: { type: Number, required: true, default: 0 },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

studentCategorySchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const StudentCategory =
  models.StudentCategory ??
  model<IStudentCategory>("StudentCategory", studentCategorySchema);
