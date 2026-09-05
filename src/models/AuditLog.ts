import { Schema, model, models, type Document, type Types } from "mongoose";
import { ROLES, type Role as RoleKey } from "@/lib/permissions/roles";

export interface IAuditLog extends Document {
  organizationId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorRoleSnapshot?: RoleKey;
  action: string;
  targetType: string;
  targetId?: Types.ObjectId;
  metadata?: unknown;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRoleSnapshot: { type: String, enum: Object.values(ROLES) },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ organizationId: 1, createdAt: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export const AuditLog =
  models.AuditLog ?? model<IAuditLog>("AuditLog", auditLogSchema);
