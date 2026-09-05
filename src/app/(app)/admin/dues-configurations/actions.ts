"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createDuesConfiguration,
  deactivateDuesConfiguration,
  reactivateDuesConfiguration,
  DuesConfigurationError,
} from "@/services/dues-configuration.service";
import { parseGhsToPesewas } from "@/lib/format/currency";

const CreateDuesConfigurationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(1, { message: "Code is required." }),
  paymentPeriodId: z.string().min(1, { message: "Select a payment period." }),
  amount: z.string().min(1, { message: "Enter an amount." }),
  facultyId: z.string().optional(),
  departmentId: z.string().optional(),
  academicLevelId: z.string().optional(),
  studentCategoryId: z.string().optional(),
  isMandatory: z.coerce.boolean(),
});

export interface CreateDuesConfigurationFormState {
  error?: string;
  success?: boolean;
}

export async function createDuesConfigurationAction(
  _prevState: CreateDuesConfigurationFormState | undefined,
  formData: FormData,
): Promise<CreateDuesConfigurationFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = CreateDuesConfigurationSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    paymentPeriodId: formData.get("paymentPeriodId"),
    amount: formData.get("amount"),
    facultyId: formData.get("facultyId") || undefined,
    departmentId: formData.get("departmentId") || undefined,
    academicLevelId: formData.get("academicLevelId") || undefined,
    studentCategoryId: formData.get("studentCategoryId") || undefined,
    isMandatory: formData.get("isMandatory"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let amountPesewas: number;
  try {
    amountPesewas = parseGhsToPesewas(parsed.data.amount);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid amount." };
  }

  try {
    await createDuesConfiguration(session, session.organizationId, {
      name: parsed.data.name,
      code: parsed.data.code,
      paymentPeriodId: parsed.data.paymentPeriodId,
      amountPesewas,
      facultyId: parsed.data.facultyId,
      departmentId: parsed.data.departmentId,
      academicLevelId: parsed.data.academicLevelId,
      studentCategoryId: parsed.data.studentCategoryId,
      isMandatory: parsed.data.isMandatory,
    });
  } catch (error) {
    if (error instanceof DuesConfigurationError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/dues-configurations");
  return { success: true };
}

export async function deactivateDuesConfigurationAction(duesConfigurationId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivateDuesConfiguration(session, session.organizationId, duesConfigurationId);
  revalidatePath("/admin/dues-configurations");
}

export async function reactivateDuesConfigurationAction(duesConfigurationId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivateDuesConfiguration(session, session.organizationId, duesConfigurationId);
  revalidatePath("/admin/dues-configurations");
}
