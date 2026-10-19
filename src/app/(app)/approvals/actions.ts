"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import {
  decideFirstStageApproval,
  decideSuperAdminApproval,
  WithdrawalError,
} from "@/services/withdrawal.service";

/**
 * One action for the whole queue — dispatches by the acting user's own
 * role, since a single viewer's queue is homogeneous in stage (a Dean/HOD
 * only ever sees PENDING_DEAN_APPROVAL rows here, a Super Admin only ever
 * sees PENDING_SUPER_ADMIN_APPROVAL ones). See ARCHITECTURE.md Phase 21.
 */
export async function decideApprovalQueueAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED" | "RETURNED",
  comment?: string,
): Promise<void> {
  const session = await verifySession();

  try {
    if (session.role === ROLES.FACULTY_DEAN || session.role === ROLES.DEPT_HOD) {
      await decideFirstStageApproval(session, session.organizationId ?? "", requestId, {
        decision,
        comment,
      });
    } else if (session.role === ROLES.SUPER_ADMIN) {
      if (decision === "RETURNED") {
        throw new WithdrawalError("The Super Admin stage does not support returning for correction.");
      }
      await decideSuperAdminApproval(session, null, requestId, { decision, comment });
    } else {
      throw new WithdrawalError("Not authorized to decide on withdrawal requests.");
    }
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath("/approvals");
}
