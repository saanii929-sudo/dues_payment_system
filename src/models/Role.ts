import { Schema, model, models, type Document } from "mongoose";
import { ROLES, type Role as RoleKey } from "@/lib/permissions/roles";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";

export type RoleLevel =
  | "PLATFORM"
  | "ORGANIZATION"
  | "FACULTY"
  | "DEPARTMENT"
  | "STUDENT";

export interface IRole extends Document, DeactivationFields {
  key: RoleKey;
  label: string;
  level: RoleLevel;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    key: { type: String, required: true, enum: Object.values(ROLES) },
    label: { type: String, required: true },
    level: {
      type: String,
      required: true,
      enum: ["PLATFORM", "ORGANIZATION", "FACULTY", "DEPARTMENT", "STUDENT"],
    },
    description: { type: String, required: true },
    ...deactivationFieldsSchemaDefinition,
  },
  { timestamps: true },
);

roleSchema.index({ key: 1 }, { unique: true });

export const Role = models.Role ?? model<IRole>("Role", roleSchema);
