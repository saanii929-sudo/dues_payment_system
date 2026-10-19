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
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  academicLevelId?: Types.ObjectId;
  studentCategoryId?: Types.ObjectId;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Faculty/Department/AcademicLevel/StudentCategory are optional — the
 * Student List Upload (Phase 23) explicitly allows a row to omit any of
 * them, and nothing else in the app reads a `Student` document assuming
 * they're present (the public payment form is fully self-service and never
 * looks one up). See ARCHITECTURE.md Phase 23.
 */
const studentSchema = new Schema<IStudent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    indexNumber: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    academicLevelId: { type: Schema.Types.ObjectId, ref: "AcademicLevel" },
    studentCategoryId: { type: Schema.Types.ObjectId, ref: "StudentCategory" },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

studentSchema.index({ organizationId: 1, indexNumber: 1 }, { unique: true });

export const Student = models.Student ?? model<IStudent>("Student", studentSchema);
