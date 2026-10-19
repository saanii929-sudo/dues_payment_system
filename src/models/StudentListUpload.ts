import { Schema, model, models, type Document, type Types } from "mongoose";
import type { StudentListUploadStatus } from "./shared/types";

export type StudentListFileFormat = "CSV" | "XLSX" | "XLS";

export interface IStudentListUpload extends Document {
  organizationId: Types.ObjectId;
  uploadedById: Types.ObjectId;
  fileName: string;
  fileFormat: StudentListFileFormat;
  status: StudentListUploadStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errorLog?: string;
  originalFileData: Buffer;
  originalFileMimeType: string;
  originalFileSizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const studentListUploadSchema = new Schema<IStudentListUpload>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    uploadedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    fileFormat: { type: String, required: true, enum: ["CSV", "XLSX", "XLS"] },
    status: {
      type: String,
      required: true,
      enum: ["PROCESSING", "COMPLETED", "FAILED"],
      default: "PROCESSING",
    },
    totalRows: { type: Number, required: true, default: 0 },
    successRows: { type: Number, required: true, default: 0 },
    failedRows: { type: Number, required: true, default: 0 },
    errorLog: { type: String },
    originalFileData: { type: Buffer, required: true },
    originalFileMimeType: { type: String, required: true },
    originalFileSizeBytes: { type: Number, required: true },
  },
  { timestamps: true },
);

studentListUploadSchema.index({ organizationId: 1, createdAt: 1 });

export const StudentListUpload =
  models.StudentListUpload ??
  model<IStudentListUpload>("StudentListUpload", studentListUploadSchema);
