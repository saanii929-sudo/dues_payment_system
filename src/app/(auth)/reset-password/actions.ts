"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { requestPasswordReset } from "@/services/auth.service";

const RequestResetSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
});

export interface RequestResetFormState {
  submitted?: boolean;
  error?: string;
}

export async function requestPasswordResetAction(
  _prevState: RequestResetFormState | undefined,
  formData: FormData,
): Promise<RequestResetFormState> {
  const parsed = RequestResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  await requestPasswordReset(parsed.data.email, `${protocol}://${host}`);

  return { submitted: true };
}
