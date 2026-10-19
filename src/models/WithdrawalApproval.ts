import { Schema, model, models, type Document, type Types } from "mongoose";
import { ROLES, type Role as RoleKey } from "@/lib/permissions/roles";

export type WithdrawalApprovalStage = "FIRST" | "SUPER_ADMIN";
export type WithdrawalDecision = "APPROVED" | "REJECTED" | "RETURNED";

export interface IWithdrawalApproval extends Document {
  withdrawalRequestId: Types.ObjectId;
  stage: WithdrawalApprovalStage;
  approverId: Types.ObjectId;
  approverRoleSnapshot: RoleKey;
  decision: WithdrawalDecision;
  comment?: string;
  decidedAt: Date;
}

const withdrawalApprovalSchema = new Schema<IWithdrawalApproval>(
  {
    withdrawalRequestId: {
      type: Schema.Types.ObjectId,
      ref: "WithdrawalRequest",
      required: true,
    },
    stage: { type: String, required: true, enum: ["FIRST", "SUPER_ADMIN"] },
    approverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approverRoleSnapshot: {
      type: String,
      required: true,
      enum: Object.values(ROLES),
    },
    decision: { type: String, required: true, enum: ["APPROVED", "REJECTED", "RETURNED"] },
    comment: { type: String },
    decidedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

withdrawalApprovalSchema.index({ withdrawalRequestId: 1, decidedAt: 1 });

export const WithdrawalApproval =
  models.WithdrawalApproval ??
  model<IWithdrawalApproval>("WithdrawalApproval", withdrawalApprovalSchema);
