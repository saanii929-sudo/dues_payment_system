"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { authenticateUser, AuthError } from "@/services/auth.service";
import { resolveHomePath } from "@/lib/auth/redirectHome";

const LoginSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export interface LoginFormState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginFormState | undefined,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let sessionUser;
  try {
    sessionUser = await authenticateUser(parsed.data.email, parsed.data.password);
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(resolveHomePath(sessionUser));
}
