"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createRevenueRule,
  updateRevenueRule,
  deactivateRevenueRule,
  reactivateRevenueRule,
  RevenueRuleError,
} from "@/services/revenue-rule.service";
import { RevenueAllocationError } from "@/services/revenue-allocation.service";

const RevenueRuleFormSchema = z
  .object({
    name: z.string().min(1, { message: "Name is required." }),
    paymentPeriodId: z.string().nullish(),
    facultyId: z.string().nullish(),
    departmentId: z.string().nullish(),
    academicLevelId: z.string().nullish(),
    studentCategoryId: z.string().nullish(),
    priority: z.coerce.number().int().min(0),
    facultyShareType: z.enum(["FIXED", "PERCENTAGE"]),
    facultyShareAmount: z.string().nullish(),
    facultyShareBps: z.string().nullish(),
  })
  .transform((data) => ({
    name: data.name,
    paymentPeriodId: data.paymentPeriodId || undefined,
    facultyId: data.facultyId || undefined,
    departmentId: data.departmentId || undefined,
    academicLevelId: data.academicLevelId || undefined,
    studentCategoryId: data.studentCategoryId || undefined,
    priority: data.priority,
    facultyShareType: data.facultyShareType,
    facultyShareAmountPesewas:
      data.facultyShareType === "FIXED" && data.facultyShareAmount
        ? Math.round(Number(data.facultyShareAmount) * 100)
        : undefined,
    facultyShareBps:
      data.facultyShareType === "PERCENTAGE" && data.facultyShareBps
        ? Math.round(Number(data.facultyShareBps) * 100)
        : undefined,
  }));

function readForm(formData: FormData) {
  return RevenueRuleFormSchema.parse({
    name: formData.get("name"),
    paymentPeriodId: formData.get("paymentPeriodId"),
    facultyId: formData.get("facultyId"),
    departmentId: formData.get("departmentId"),
    academicLevelId: formData.get("academicLevelId"),
    studentCategoryId: formData.get("studentCategoryId"),
    priority: formData.get("priority") || 0,
    facultyShareType: formData.get("facultyShareType"),
    facultyShareAmount: formData.get("facultyShareAmount"),
    facultyShareBps: formData.get("facultyShareBps"),
  });
}

export async function createRevenueRuleAction(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const input = readForm(formData);
  try {
    await createRevenueRule(session, session.organizationId, input);
  } catch (error) {
    if (error instanceof RevenueRuleError || error instanceof RevenueAllocationError) {
      throw new Error(error.message);
    }
    throw error;
  }
  revalidatePath("/admin/revenue-rules");
}

export async function updateRevenueRuleAction(ruleId: string, formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const input = readForm(formData);
  try {
    await updateRevenueRule(session, session.organizationId, ruleId, input);
  } catch (error) {
    if (error instanceof RevenueRuleError || error instanceof RevenueAllocationError) {
      throw new Error(error.message);
    }
    throw error;
  }
  revalidatePath("/admin/revenue-rules");
}

export async function deactivateRevenueRuleAction(ruleId: string): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivateRevenueRule(session, session.organizationId, ruleId);
  revalidatePath("/admin/revenue-rules");
}

export async function reactivateRevenueRuleAction(ruleId: string): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivateRevenueRule(session, session.organizationId, ruleId);
  revalidatePath("/admin/revenue-rules");
}
