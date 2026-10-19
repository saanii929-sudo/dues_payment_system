"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  updatePaymentPeriod,
  transitionPaymentPeriodStatus,
  PaymentPeriodError,
  type PaymentPeriodStatus,
} from "@/services/payment-period.service";

const UpdatePaymentPeriodSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    code: z.string().min(1, { message: "Code is required." }),
    academicYear: z.string().min(1, { message: "Academic year is required." }),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    paymentOpenDate: z.coerce.date(),
    paymentCloseDate: z.coerce.date(),
    description: z.string().optional(),
  })
  .transform((value) => ({
    ...value,
    description: value.description?.trim() ? value.description.trim() : undefined,
  }));

export interface UpdatePaymentPeriodFormState {
  error?: string;
  success?: boolean;
}

/** Bound to `paymentPeriodId` via `.bind(null, paymentPeriodId)` in the client form. */
export async function updatePaymentPeriodAction(
  paymentPeriodId: string,
  _prevState: UpdatePaymentPeriodFormState | undefined,
  formData: FormData,
): Promise<UpdatePaymentPeriodFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = UpdatePaymentPeriodSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    academicYear: formData.get("academicYear"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    paymentOpenDate: formData.get("paymentOpenDate"),
    paymentCloseDate: formData.get("paymentCloseDate"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updatePaymentPeriod(session, session.organizationId, paymentPeriodId, parsed.data);
  } catch (error) {
    if (error instanceof PaymentPeriodError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/admin/payment-periods/${paymentPeriodId}`);
  revalidatePath("/admin/payment-periods");
  return { success: true };
}

export async function transitionPaymentPeriodStatusAction(
  paymentPeriodId: string,
  nextStatus: PaymentPeriodStatus,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await transitionPaymentPeriodStatus(session, session.organizationId, paymentPeriodId, nextStatus);
  revalidatePath(`/admin/payment-periods/${paymentPeriodId}`);
  revalidatePath("/admin/payment-periods");
  revalidatePath("/admin/dues-configurations");
  revalidatePath("/admin");
}
