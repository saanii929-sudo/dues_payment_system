"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { updatePlatformSettings } from "@/services/platform.service";

const PaymentConfigSchema = z.object({
  paymentEnvironment: z.enum(["SANDBOX", "LIVE"]),
  defaultCurrency: z
    .string()
    .length(3, { message: "Currency code must be 3 letters, e.g. GHS." })
    .toUpperCase(),
  cardPaymentsEnabled: z.coerce.boolean(),
  mobileMoneyEnabled: z.coerce.boolean(),
});

export interface PaymentConfigFormState {
  error?: string;
  success?: boolean;
}

export async function updatePaymentConfigAction(
  _prevState: PaymentConfigFormState | undefined,
  formData: FormData,
): Promise<PaymentConfigFormState> {
  const session = await verifySession();
  const parsed = PaymentConfigSchema.safeParse({
    paymentEnvironment: formData.get("paymentEnvironment"),
    defaultCurrency: formData.get("defaultCurrency"),
    cardPaymentsEnabled: formData.get("cardPaymentsEnabled"),
    mobileMoneyEnabled: formData.get("mobileMoneyEnabled"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updatePlatformSettings(session, parsed.data);
  revalidatePath("/super-admin/settings/payments");
  return { success: true };
}
