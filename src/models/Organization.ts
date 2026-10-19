import { Schema, model, models, type Document } from "mongoose";
import {
  auditFieldsSchemaDefinition,
  type AuditFields,
} from "./shared/auditFields";
import {
  deactivationFieldsSchemaDefinition,
  type DeactivationFields,
} from "./shared/deactivationFields";

export interface IOrganization
  extends Document,
    AuditFields,
    DeactivationFields {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    logoUrl: { type: String },
    ...deactivationFieldsSchemaDefinition,
    ...auditFieldsSchemaDefinition,
  },
  { timestamps: true },
);

organizationSchema.index({ slug: 1 }, { unique: true });

export const Organization =
  models.Organization ?? model<IOrganization>("Organization", organizationSchema);
