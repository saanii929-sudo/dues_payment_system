import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";

export interface IDepartment
  extends Document,
    AuditFields,
    DeactivationFields {
  organizationId: Types.ObjectId;
  facultyId: Types.ObjectId;
  name: string;
  code: string;
  /** Convenience pointer only — actual authority comes from UserRole. */
  hodUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    hodUserId: { type: Schema.Types.ObjectId, ref: "User" },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

departmentSchema.index(
  { organizationId: 1, facultyId: 1, code: 1 },
  { unique: true },
);

export const Department =
  models.Department ?? model<IDepartment>("Department", departmentSchema);
