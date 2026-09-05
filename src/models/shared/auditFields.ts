import { Schema, type Types } from "mongoose";

/**
 * Mixed into every schema. `createdAt`/`updatedAt` come from Mongoose's
 * built-in `{ timestamps: true }` option, declared per-schema, not here.
 * Nullable because some writes originate from webhooks/system jobs with no
 * acting user.
 */
export interface AuditFields {
  createdById?: Types.ObjectId;
  updatedById?: Types.ObjectId;
}

export const auditFieldsSchemaDefinition = {
  createdById: { type: Schema.Types.ObjectId, ref: "User" },
  updatedById: { type: Schema.Types.ObjectId, ref: "User" },
};
