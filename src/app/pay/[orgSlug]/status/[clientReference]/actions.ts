"use server";

import { getPaymentByClientReference, type PaymentSummary } from "@/services/payment.service";

export async function getPaymentStatusAction(
  clientReference: string,
): Promise<PaymentSummary | null> {
  return getPaymentByClientReference(clientReference);
}
