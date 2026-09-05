import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PesewasAmount } from "./shared/types";

export interface IDepartmentWallet extends Document {
  organizationId: Types.ObjectId;
  departmentId: Types.ObjectId;
  balancePesewas: PesewasAmount;
  totalCreditedPesewas: PesewasAmount;
  totalDebitedPesewas: PesewasAmount;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentWalletSchema = new Schema<IDepartmentWallet>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    balancePesewas: { type: Number, required: true, default: 0 },
    totalCreditedPesewas: { type: Number, required: true, default: 0 },
    totalDebitedPesewas: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

departmentWalletSchema.index(
  { organizationId: 1, departmentId: 1 },
  { unique: true },
);

export const DepartmentWallet =
  models.DepartmentWallet ??
  model<IDepartmentWallet>("DepartmentWallet", departmentWalletSchema);
