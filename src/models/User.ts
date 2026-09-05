import { Schema, model, models, type Document } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";

export interface IUser extends Document, AuditFields, DeactivationFields {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  lastLoginAt?: Date;
  mustResetPassword: boolean;
  /**
   * Set whenever the password changes. A session token issued before this
   * timestamp is rejected in the DAL — see ARCHITECTURE.md "Password reset
   * invalidates existing sessions immediately".
   */
  passwordChangedAt?: Date;
  /** MFA extension point — no TOTP flow implemented yet, see ARCHITECTURE.md. */
  mfaEnabled: boolean;
  totpSecretEncrypted?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    lastLoginAt: { type: Date },
    mustResetPassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
    mfaEnabled: { type: Boolean, default: false },
    totpSecretEncrypted: { type: String },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export const User = models.User ?? model<IUser>("User", userSchema);
