import { Schema, model, models, type Document, type Types } from "mongoose";
import type { BasisPoints, RevenueBeneficiaryType } from "./shared/types";

export type PaymentEnvironment = "SANDBOX" | "LIVE";

export interface IPlatformRevenueSplit {
  beneficiaryType: RevenueBeneficiaryType;
  percentageBps: BasisPoints;
}

export interface IPlatformSettings extends Document<string> {
  platformName: string;
  supportEmail: string;
  paymentEnvironment: PaymentEnvironment;
  defaultCurrency: string;
  cardPaymentsEnabled: boolean;
  mobileMoneyEnabled: boolean;
  /** Segregation-of-duties policy for withdrawal approvals — see ARCHITECTURE.md Phase 21. Off by default. */
  allowWithdrawalSelfApproval: boolean;
  defaultRevenueSplits: IPlatformRevenueSplit[];
  updatedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const platformRevenueSplitSchema = new Schema<IPlatformRevenueSplit>(
  {
    beneficiaryType: {
      type: String,
      required: true,
      enum: ["ORGANIZATION", "FACULTY", "DEPARTMENT"],
    },
    percentageBps: { type: Number, required: true, min: 0, max: 10000 },
  },
  { _id: false },
);

const platformSettingsSchema = new Schema<IPlatformSettings>(
  {
    _id: { type: String },
    platformName: { type: String, required: true, default: "Student Dues Platform" },
    supportEmail: { type: String, required: true, default: "support@example.com" },
    paymentEnvironment: {
      type: String,
      required: true,
      enum: ["SANDBOX", "LIVE"],
      default: "SANDBOX",
    },
    defaultCurrency: { type: String, required: true, default: "GHS" },
    cardPaymentsEnabled: { type: Boolean, default: true },
    mobileMoneyEnabled: { type: Boolean, default: true },
    allowWithdrawalSelfApproval: { type: Boolean, default: false },
    defaultRevenueSplits: {
      type: [platformRevenueSplitSchema],
      required: true,
      default: [
        { beneficiaryType: "ORGANIZATION", percentageBps: 2000 },
        { beneficiaryType: "FACULTY", percentageBps: 3000 },
        { beneficiaryType: "DEPARTMENT", percentageBps: 5000 },
      ],
      validate: {
        validator: (splits: IPlatformRevenueSplit[]) =>
          splits.reduce((sum, split) => sum + split.percentageBps, 0) === 10000,
        message: "Revenue split percentages must sum to 10000 basis points (100%).",
      },
    },
    updatedById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const PLATFORM_SETTINGS_ID = "platform";

export const PlatformSettings =
  models.PlatformSettings ??
  model<IPlatformSettings>("PlatformSettings", platformSettingsSchema);
