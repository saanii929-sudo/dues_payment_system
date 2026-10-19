"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createDuesConfiguration,
  updateDuesConfiguration,
  transitionDuesConfigurationStatus,
  DuesConfigurationError,
} from "@/services/dues-configuration.service";
import type { DuesConfigurationStatus } from "@/services/dues-configuration.service";
import { parseGhsToPesewas } from "@/lib/format/currency";

const DuesConfigurationInputSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(1, { message: "Code is required." }),
  paymentPeriodId: z.string().min(1, { message: "Select a payment period." }),
  amount: z.string().min(1, { message: "Enter an amount." }),
  effectiveDate: z.coerce.date(),
  facultyId: z.string().optional(),
  departmentId: z.string().optional(),
  academicLevelId: z.string().optional(),
  studentCategoryId: z.string().optional(),
  isMandatory: z.boolean(),
});

/** What the client actually sends — a date `<input>`'s value is a string, coerced to a Date server-side. */
export interface DuesConfigurationFormInput {
  name: string;
  code: string;
  paymentPeriodId: string;
  amount: string;
  effectiveDate: string;
  facultyId?: string;
  departmentId?: string;
  academicLevelId?: string;
  studentCategoryId?: string;
  isMandatory: boolean;
}

function parseInput(raw: DuesConfigurationFormInput) {
  const parsed = DuesConfigurationInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DuesConfigurationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const amountPesewas = parseGhsToPesewas(parsed.data.amount);

  return {
    name: parsed.data.name,
    code: parsed.data.code,
    paymentPeriodId: parsed.data.paymentPeriodId,
    amountPesewas,
    effectiveDate: parsed.data.effectiveDate,
    facultyId: parsed.data.facultyId || undefined,
    departmentId: parsed.data.departmentId || undefined,
    academicLevelId: parsed.data.academicLevelId || undefined,
    studentCategoryId: parsed.data.studentCategoryId || undefined,
    isMandatory: parsed.data.isMandatory,
  };
}

export async function createDuesConfigurationAction(
  input: DuesConfigurationFormInput,
  publish: boolean,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const data = parseInput(input);
  await createDuesConfiguration(session, session.organizationId, data, { publish });
  revalidatePath("/admin/dues-configurations");
}

export async function updateDuesConfigurationAction(
  duesConfigurationId: string,
  input: DuesConfigurationFormInput,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const data = parseInput(input);
  await updateDuesConfiguration(session, session.organizationId, duesConfigurationId, data);
  revalidatePath("/admin/dues-configurations");
}

export async function transitionDuesConfigurationStatusAction(
  duesConfigurationId: string,
  nextStatus: DuesConfigurationStatus,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await transitionDuesConfigurationStatus(
    session,
    session.organizationId,
    duesConfigurationId,
    nextStatus,
  );
  revalidatePath("/admin/dues-configurations");
}
