"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createRevenueDeduction,
  updateRevenueDeduction,
  transitionRevenueDeductionStatus,
  RevenueAllocationError,
} from "@/services/revenue-allocation.service";
import type { RevenueDeductionStatus } from "@/models";

const RevenueDeductionFormSchema = z
  .object({
    name: z.string().min(1, { message: "Name is required." }),
    paymentPeriodId: z.string().nullish(),
    facultyId: z.string().nullish(),
    departmentId: z.string().nullish(),
    academicLevelId: z.string().nullish(),
    studentCategoryId: z.string().nullish(),
    deductionType: z.enum(["FIXED", "PERCENTAGE"]),
    // Mutually exclusive in the UI (only the field matching the selected
    // deduction type is rendered), so FormData.get() returns null — not
    // merely absent — for whichever one isn't shown.
    amount: z.string().nullish(),
    percentageBps: z.string().nullish(),
  })
  .transform((data) => ({
    name: data.name,
    paymentPeriodId: data.paymentPeriodId || undefined,
    facultyId: data.facultyId || undefined,
    departmentId: data.departmentId || undefined,
    academicLevelId: data.academicLevelId || undefined,
    studentCategoryId: data.studentCategoryId || undefined,
    deductionType: data.deductionType,
    amountPesewas:
      data.deductionType === "FIXED" && data.amount
        ? Math.round(Number(data.amount) * 100)
        : undefined,
    percentageBps:
      data.deductionType === "PERCENTAGE" && data.percentageBps
        ? Math.round(Number(data.percentageBps) * 100)
        : undefined,
  }));

function readForm(formData: FormData) {
  return RevenueDeductionFormSchema.parse({
    name: formData.get("name"),
    paymentPeriodId: formData.get("paymentPeriodId"),
    facultyId: formData.get("facultyId"),
    departmentId: formData.get("departmentId"),
    academicLevelId: formData.get("academicLevelId"),
    studentCategoryId: formData.get("studentCategoryId"),
    deductionType: formData.get("deductionType"),
    amount: formData.get("amount"),
    percentageBps: formData.get("percentageBps"),
  });
}

export async function createRevenueDeductionAction(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const input = readForm(formData);
  try {
    await createRevenueDeduction(session, session.organizationId, input);
  } catch (error) {
    if (error instanceof RevenueAllocationError) throw new Error(error.message);
    throw error;
  }
  revalidatePath("/admin/revenue-deductions");
}

export async function updateRevenueDeductionAction(
  deductionId: string,
  formData: FormData,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const input = readForm(formData);
  try {
    await updateRevenueDeduction(session, session.organizationId, deductionId, input);
  } catch (error) {
    if (error instanceof RevenueAllocationError) throw new Error(error.message);
    throw error;
  }
  revalidatePath("/admin/revenue-deductions");
}

export async function transitionRevenueDeductionStatusAction(
  deductionId: string,
  nextStatus: RevenueDeductionStatus,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  try {
    await transitionRevenueDeductionStatus(session, session.organizationId, deductionId, nextStatus);
  } catch (error) {
    if (error instanceof RevenueAllocationError) throw new Error(error.message);
    throw error;
  }
  revalidatePath("/admin/revenue-deductions");
}
