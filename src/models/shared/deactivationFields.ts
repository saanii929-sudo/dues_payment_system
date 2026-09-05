import { Schema, type Types } from "mongoose";

/**
 * Soft-deactivation fields for structural/config entities. Never mixed into
 * financial ledger collections (payments, wallet transactions, withdrawals,
 * refunds, audit logs) — those are append-only and never deactivated or
 * deleted, see ARCHITECTURE.md.
 */
export interface DeactivationFields {
  isActive: boolean;
  deactivatedAt?: Date;
  deactivatedById?: Types.ObjectId;
}

export const deactivationFieldsSchemaDefinition = {
  isActive: { type: Boolean, default: true },
  deactivatedAt: { type: Date },
  deactivatedById: { type: Schema.Types.ObjectId, ref: "User" },
};
