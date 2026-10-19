import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";

export interface IFaculty extends Document, AuditFields, DeactivationFields {
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  deanUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const facultySchema = new Schema<IFaculty>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    deanUserId: { type: Schema.Types.ObjectId, ref: "User" },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

facultySchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Faculty = models.Faculty ?? model<IFaculty>("Faculty", facultySchema);
