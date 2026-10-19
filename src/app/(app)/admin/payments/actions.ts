"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { processRefund, RefundError } from "@/services/refund.service";

/** Shared by the Payment Details page and Duplicate Payment Review — refunding an already-SUCCESSFUL payment is the only status-affecting action anywhere in this admin surface. */
export async function refundPaymentAction(paymentId: string, formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new RefundError("Enter a reason for this refund.");
  }

  await processRefund(session, session.organizationId, paymentId, reason);
  revalidatePath(`/admin/payments/${paymentId}`);
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/duplicates");
  revalidatePath("/admin/payments/monitoring");
  revalidatePath("/admin/payments/reports");
}
