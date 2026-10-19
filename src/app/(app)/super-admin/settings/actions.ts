"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { updatePlatformSettings } from "@/services/platform.service";

const GeneralSettingsSchema = z.object({
  platformName: z.string().min(2, { message: "Platform name must be at least 2 characters." }),
  supportEmail: z.string().email({ message: "Enter a valid email address." }),
  allowWithdrawalSelfApproval: z.coerce.boolean(),
});

export interface GeneralSettingsFormState {
  error?: string;
  success?: boolean;
}

export async function updateGeneralSettingsAction(
  _prevState: GeneralSettingsFormState | undefined,
  formData: FormData,
): Promise<GeneralSettingsFormState> {
  const session = await verifySession();
  const parsed = GeneralSettingsSchema.safeParse({
    platformName: formData.get("platformName"),
    supportEmail: formData.get("supportEmail"),
    allowWithdrawalSelfApproval: formData.get("allowWithdrawalSelfApproval"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updatePlatformSettings(session, parsed.data);
  revalidatePath("/super-admin/settings");
  return { success: true };
}
