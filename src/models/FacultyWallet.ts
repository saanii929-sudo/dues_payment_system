import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PesewasAmount } from "./shared/types";

export interface IFacultyWallet extends Document {
  organizationId: Types.ObjectId;
  facultyId: Types.ObjectId;
  balancePesewas: PesewasAmount;
  totalCreditedPesewas: PesewasAmount;
  totalDebitedPesewas: PesewasAmount;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const facultyWalletSchema = new Schema<IFacultyWallet>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true },
    balancePesewas: { type: Number, required: true, default: 0 },
    totalCreditedPesewas: { type: Number, required: true, default: 0 },
    totalDebitedPesewas: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

facultyWalletSchema.index({ organizationId: 1, facultyId: 1 }, { unique: true });

export const FacultyWallet =
  models.FacultyWallet ?? model<IFacultyWallet>("FacultyWallet", facultyWalletSchema);
