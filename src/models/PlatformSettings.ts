import { Schema, model, models, type Document, type Types } from "mongoose";
import type { BasisPoints, RevenueBeneficiaryType } from "./shared/types";

export type PaymentEnvironment = "SANDBOX" | "LIVE";

export interface IPlatformRevenueSplit {
  beneficiaryType: RevenueBeneficiaryType;
  percentageBps: BasisPoints;
}

/**
 * Singleton document (fixed _id "platform") backing the Global Payment
 * Configuration, Global Revenue Rules, and Platform Settings screens.
 * `defaultRevenueSplits` isn't decorative — creating an organization seeds
 * that org's first RevenueAllocationRule from it. See ARCHITECTURE.md
 * Phase 4.
 */
export interface IPlatformSettings extends Document<string> {
  platformName: string;
  supportEmail: string;
  paymentEnvironment: PaymentEnvironment;
  defaultCurrency: string;
  cardPaymentsEnabled: boolean;
  mobileMoneyEnabled: boolean;
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
