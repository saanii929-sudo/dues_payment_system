import { Schema, model, models, type Document, type Types } from "mongoose";
import type { StudentListRowStatus } from "./shared/types";

export interface IStudentListEntry extends Document {
  uploadId: Types.ObjectId;
  organizationId: Types.ObjectId;
  indexNumber: string;
  fullName: string;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  academicLevelId?: Types.ObjectId;
  studentCategoryId?: Types.ObjectId;
  rowStatus: StudentListRowStatus;
  errorReason?: string;
  createdAt: Date;
}

const studentListEntrySchema = new Schema<IStudentListEntry>(
  {
    uploadId: {
      type: Schema.Types.ObjectId,
      ref: "StudentListUpload",
      required: true,
    },
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
    rowStatus: {
      type: String,
      required: true,
      enum: ["VALID", "INVALID", "DUPLICATE"],
    },
    errorReason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

studentListEntrySchema.index({ uploadId: 1 });
studentListEntrySchema.index({ organizationId: 1, indexNumber: 1 });

export const StudentListEntry =
  models.StudentListEntry ??
  model<IStudentListEntry>("StudentListEntry", studentListEntrySchema);
