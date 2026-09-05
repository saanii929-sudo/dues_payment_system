import { Schema, model, models, type Document, type Types } from "mongoose";

/**
 * Single-use. The raw token is emailed to the user and never stored — only
 * its SHA-256 hash. See ARCHITECTURE.md "New PasswordResetToken model".
 */
export interface IPasswordResetToken extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

passwordResetTokenSchema.index({ tokenHash: 1 }, { unique: true });
passwordResetTokenSchema.index({ userId: 1, createdAt: 1 });
// TTL cleanup: Mongo removes the document ~immediately after expiresAt passes.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken =
  models.PasswordResetToken ??
  model<IPasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);
