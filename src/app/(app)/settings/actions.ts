"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { changePassword, AuthError } from "@/services/auth.service";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Current password is required." }),
    newPassword: z.string().min(8, { message: "New password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export interface ChangePasswordFormState {
  error?: string;
}

export async function changePasswordAction(
  _prevState: ChangePasswordFormState | undefined,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const session = await verifySession();
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await changePassword(session, parsed.data.currentPassword, parsed.data.newPassword);
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: error.message };
    }
    throw error;
  }

  // Changing your password invalidates every session, including this one —
  // see services/auth.service.ts#changePassword — so send the user to log
  // back in with the new password rather than leaving them on a dead session.
  redirect("/login");
}
