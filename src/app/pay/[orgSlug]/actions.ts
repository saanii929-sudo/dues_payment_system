"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { initiatePayment, PaymentError } from "@/services/payment.service";

const PaymentFormSchema = z.object({
  indexNumber: z.string().min(2, { message: "Enter your index number." }),
  fullName: z.string().min(2, { message: "Enter your full name." }),
  academicLevelId: z.string().min(1, { message: "Select your academic level." }),
  studentCategoryId: z.string().min(1, { message: "Select your student category." }),
  facultyId: z.string().optional(),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export interface InitiatePaymentFormState {
  error?: string;
}

/** Bound to `orgSlug` via `.bind(null, orgSlug)` in the client form. */
export async function initiatePaymentAction(
  orgSlug: string,
  _prevState: InitiatePaymentFormState | undefined,
  formData: FormData,
): Promise<InitiatePaymentFormState> {
  const parsed = PaymentFormSchema.safeParse({
    indexNumber: formData.get("indexNumber"),
    fullName: formData.get("fullName"),
    academicLevelId: formData.get("academicLevelId"),
    studentCategoryId: formData.get("studentCategoryId"),
    facultyId: formData.get("facultyId") || undefined,
    departmentId: formData.get("departmentId") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const appBaseUrl = `${protocol}://${host}`;

  let checkoutUrl: string | null;
  try {
    const result = await initiatePayment(orgSlug, parsed.data, { appBaseUrl });
    checkoutUrl = result.checkoutUrl;
  } catch (error) {
    if (error instanceof PaymentError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(checkoutUrl ?? `/pay/${orgSlug}`);
}
