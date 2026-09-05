import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";

export interface IStudent extends Document, AuditFields, DeactivationFields {
  organizationId: Types.ObjectId;
  indexNumber: string;
  fullName: string;
  facultyId: Types.ObjectId;
  departmentId: Types.ObjectId;
  academicLevelId: Types.ObjectId;
  studentCategoryId: Types.ObjectId;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    indexNumber: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    academicLevelId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicLevel",
      required: true,
    },
    studentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "StudentCategory",
      required: true,
    },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

studentSchema.index({ organizationId: 1, indexNumber: 1 }, { unique: true });

export const Student = models.Student ?? model<IStudent>("Student", studentSchema);
