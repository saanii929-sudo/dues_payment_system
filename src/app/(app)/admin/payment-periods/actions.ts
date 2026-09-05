"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createPaymentPeriod,
  deactivatePaymentPeriod,
  reactivatePaymentPeriod,
  setCurrentPaymentPeriod,
  PaymentPeriodError,
} from "@/services/payment-period.service";

const CreatePaymentPeriodSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(1, { message: "Code is required." }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export interface CreatePaymentPeriodFormState {
  error?: string;
  success?: boolean;
}

export async function createPaymentPeriodAction(
  _prevState: CreatePaymentPeriodFormState | undefined,
  formData: FormData,
): Promise<CreatePaymentPeriodFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = CreatePaymentPeriodSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createPaymentPeriod(session, session.organizationId, parsed.data);
  } catch (error) {
    if (error instanceof PaymentPeriodError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/payment-periods");
  return { success: true };
}

export async function deactivatePaymentPeriodAction(paymentPeriodId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivatePaymentPeriod(session, session.organizationId, paymentPeriodId);
  revalidatePath("/admin/payment-periods");
}

export async function reactivatePaymentPeriodAction(paymentPeriodId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivatePaymentPeriod(session, session.organizationId, paymentPeriodId);
  revalidatePath("/admin/payment-periods");
}

export async function setCurrentPaymentPeriodAction(paymentPeriodId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await setCurrentPaymentPeriod(session, session.organizationId, paymentPeriodId);
  revalidatePath("/admin/payment-periods");
}
