"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { resetPassword, AuthError } from "@/services/auth.service";

const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export interface ResetPasswordFormState {
  error?: string;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordFormState | undefined,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const parsed = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/login");
}
