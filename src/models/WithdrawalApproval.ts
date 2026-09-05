import { Schema, model, models, type Document, type Types } from "mongoose";
import { ROLES, type Role as RoleKey } from "@/lib/permissions/roles";
import type { WithdrawalDecision } from "./shared/types";

export interface IWithdrawalApproval extends Document {
  withdrawalRequestId: Types.ObjectId;
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
    approverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approverRoleSnapshot: {
      type: String,
      required: true,
      enum: Object.values(ROLES),
    },
    decision: { type: String, required: true, enum: ["APPROVED", "REJECTED"] },
    comment: { type: String },
    decidedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

withdrawalApprovalSchema.index({ withdrawalRequestId: 1, decidedAt: 1 });

export const WithdrawalApproval =
  models.WithdrawalApproval ??
  model<IWithdrawalApproval>("WithdrawalApproval", withdrawalApprovalSchema);
