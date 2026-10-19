import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";

export type PaymentPeriodStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export interface IPaymentPeriod extends Document, AuditFields {
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  academicYear: string;
  startDate: Date;
  endDate: Date;
  paymentOpenDate: Date;
  paymentCloseDate: Date;
  status: PaymentPeriodStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentPeriodSchema = new Schema<IPaymentPeriod>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    paymentOpenDate: { type: Date, required: true },
    paymentCloseDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "SCHEDULED", "ACTIVE", "CLOSED", "ARCHIVED"],
      default: "DRAFT",
    },
    description: { type: String, trim: true },
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

paymentPeriodSchema.index({ organizationId: 1, code: 1 }, { unique: true });
paymentPeriodSchema.index(
  { organizationId: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } },
);

export const PaymentPeriod =
  models.PaymentPeriod ?? model<IPaymentPeriod>("PaymentPeriod", paymentPeriodSchema);
