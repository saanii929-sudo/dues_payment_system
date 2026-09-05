import { Schema, model, models, type Document, type Types } from "mongoose";
import { ROLES, type Role as RoleKey } from "@/lib/permissions/roles";

export interface IUserRole extends Document {
  userId: Types.ObjectId;
  roleId: Types.ObjectId;
  /** Denormalized snapshot of Role.key for fast queries without populate. */
  roleKey: RoleKey;
  organizationId?: Types.ObjectId;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  isActive: boolean;
  assignedById?: Types.ObjectId;
  assignedAt: Date;
  revokedAt?: Date;
  revokedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userRoleSchema = new Schema<IUserRole>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    roleKey: { type: String, required: true, enum: Object.values(ROLES) },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    isActive: { type: Boolean, default: true },
    assignedById: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date, required: true, default: Date.now },
    revokedAt: { type: Date },
    revokedById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

userRoleSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
userRoleSchema.index({ organizationId: 1, roleKey: 1 });
userRoleSchema.index({ facultyId: 1 });
userRoleSchema.index({ departmentId: 1 });

export const UserRole =
  models.UserRole ?? model<IUserRole>("UserRole", userRoleSchema);
