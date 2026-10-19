"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createDraftWithdrawalRequest,
  createAndSubmitWithdrawalRequest,
  updateDraftWithdrawalRequest,
  submitWithdrawalRequest,
  cancelWithdrawalRequest,
  decideFirstStageApproval,
  getWithdrawalRequestDetails,
  WithdrawalError,
  type WithdrawalRequestInput,
  type WithdrawalRequestDetails,
} from "@/services/withdrawal.service";

const WithdrawalFormSchema = z.object({
  amount: z.coerce.number().positive({ message: "Enter an amount greater than zero." }),
  reason: z.string().min(1, { message: "A reason is required." }),
  destinationMethod: z.enum(["BANK_TRANSFER", "MOBILE_MONEY"]),
  destinationAccountName: z.string().min(1, { message: "An account name is required." }),
  destinationAccountNumber: z.string().min(1, { message: "An account number is required." }),
  destinationProvider: z.string().min(1, { message: "A bank/provider is required." }),
});

function parseWithdrawalForm(formData: FormData): WithdrawalRequestInput {
  const parsed = WithdrawalFormSchema.safeParse({
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    destinationMethod: formData.get("destinationMethod"),
    destinationAccountName: formData.get("destinationAccountName"),
    destinationAccountNumber: formData.get("destinationAccountNumber"),
    destinationProvider: formData.get("destinationProvider"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  return {
    amountPesewas: Math.round(parsed.data.amount * 100),
    reason: parsed.data.reason,
    destinationMethod: parsed.data.destinationMethod,
    destinationAccountName: parsed.data.destinationAccountName,
    destinationAccountNumber: parsed.data.destinationAccountNumber,
    destinationProvider: parsed.data.destinationProvider,
  };
}

export async function saveDraftWithdrawalAction(departmentId: string, formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  const input = parseWithdrawalForm(formData);

  try {
    await createDraftWithdrawalRequest(
      session,
      session.organizationId,
      { walletType: "DEPARTMENT", departmentId },
      input,
    );
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/department/${departmentId}`);
}

export async function saveAndSubmitWithdrawalAction(departmentId: string, formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  const input = parseWithdrawalForm(formData);

  try {
    await createAndSubmitWithdrawalRequest(
      session,
      session.organizationId,
      { walletType: "DEPARTMENT", departmentId },
      input,
    );
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/department/${departmentId}`);
}

export async function updateDraftWithdrawalAction(
  departmentId: string,
  requestId: string,
  formData: FormData,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  const input = parseWithdrawalForm(formData);

  try {
    await updateDraftWithdrawalRequest(session, session.organizationId, requestId, input);
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/department/${departmentId}`);
}

export async function submitWithdrawalAction(departmentId: string, requestId: string): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  try {
    await submitWithdrawalRequest(session, session.organizationId, requestId);
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/department/${departmentId}`);
}

export async function cancelWithdrawalAction(departmentId: string, requestId: string): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  try {
    await cancelWithdrawalRequest(session, session.organizationId, requestId);
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/department/${departmentId}`);
}

export async function getWithdrawalHistoryAction(
  _departmentId: string,
  requestId: string,
): Promise<WithdrawalRequestDetails> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  try {
    return await getWithdrawalRequestDetails(session, session.organizationId, requestId);
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }
}

export async function decideFirstStageWithdrawalAction(
  departmentId: string,
  requestId: string,
  decision: "APPROVED" | "REJECTED" | "RETURNED",
  comment?: string,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  try {
    await decideFirstStageApproval(session, session.organizationId, requestId, { decision, comment });
  } catch (error) {
    if (error instanceof WithdrawalError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/department/${departmentId}`);
}
