import { Schema, model, models, type Document, type Types } from "mongoose";
import type { StudentPaymentMatchStatus } from "./shared/types";

/** Reconciliation record linking a successful payment to a roster entry. */
export interface IStudentPaymentMatch extends Document {
  organizationId: Types.ObjectId;
  paymentId: Types.ObjectId;
  studentListEntryId?: Types.ObjectId;
  indexNumber: string;
  matchStatus: StudentPaymentMatchStatus;
  matchedAt: Date;
  matchedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const studentPaymentMatchSchema = new Schema<IStudentPaymentMatch>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    studentListEntryId: {
      type: Schema.Types.ObjectId,
      ref: "StudentListEntry",
    },
    indexNumber: { type: String, required: true, trim: true },
    matchStatus: {
      type: String,
      required: true,
      enum: ["MATCHED", "UNMATCHED", "MANUAL_OVERRIDE"],
    },
    matchedAt: { type: Date, required: true, default: Date.now },
    matchedById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

studentPaymentMatchSchema.index({ paymentId: 1 }, { unique: true });
studentPaymentMatchSchema.index({ organizationId: 1, indexNumber: 1 });

export const StudentPaymentMatch =
  models.StudentPaymentMatch ??
  model<IStudentPaymentMatch>("StudentPaymentMatch", studentPaymentMatchSchema);
