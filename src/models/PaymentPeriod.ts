import { Schema, model, models, type Document, type Types } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";

export interface IPaymentPeriod
  extends Document,
    AuditFields,
    DeactivationFields {
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
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
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

paymentPeriodSchema.index({ organizationId: 1, code: 1 }, { unique: true });
paymentPeriodSchema.index(
  { organizationId: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } },
);

export const PaymentPeriod =
  models.PaymentPeriod ?? model<IPaymentPeriod>("PaymentPeriod", paymentPeriodSchema);
