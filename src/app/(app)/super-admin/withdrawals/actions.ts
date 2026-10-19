"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  decideSuperAdminApproval,
  releaseWithdrawalFunds,
  getWithdrawalRequestDetails,
  WithdrawalError,
  type WithdrawalRequestDetails,
} from "@/services/withdrawal.service";

export async function decideSuperAdminWithdrawalAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<void> {
  const session = await verifySession();

  try {
    await decideSuperAdminApproval(session, null, requestId, { decision });
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath("/super-admin/withdrawals");
}

const ReleaseFundsSchema = z.object({
  method: z.enum(["BANK_TRANSFER", "MOBILE_MONEY", "HUBTEL_PAYOUT"]),
  reference: z.string().min(1, { message: "A settlement reference is required." }),
  proofUrl: z.string().optional(),
});

export async function releaseWithdrawalFundsAction(requestId: string, formData: FormData): Promise<void> {
  const session = await verifySession();

  const parsed = ReleaseFundsSchema.safeParse({
    method: formData.get("method"),
    reference: formData.get("reference"),
    proofUrl: formData.get("proofUrl") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await releaseWithdrawalFunds(session, null, requestId, parsed.data);
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath("/super-admin/withdrawals");
}

export async function getSuperAdminWithdrawalHistoryAction(requestId: string): Promise<WithdrawalRequestDetails> {
  const session = await verifySession();

  try {
    return await getWithdrawalRequestDetails(session, null, requestId);
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }
}
