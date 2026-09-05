"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createAcademicLevel,
  updateAcademicLevel,
  moveAcademicLevel,
  deactivateAcademicLevel,
  reactivateAcademicLevel,
  AcademicLevelError,
} from "@/services/academic-level.service";

const AcademicLevelInputSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  code: z.string().min(1, { message: "Code is required." }),
  sortOrder: z.coerce.number().int().min(0),
});

export interface CreateAcademicLevelFormState {
  error?: string;
  success?: boolean;
}

export async function createAcademicLevelAction(
  _prevState: CreateAcademicLevelFormState | undefined,
  formData: FormData,
): Promise<CreateAcademicLevelFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = AcademicLevelInputSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createAcademicLevel(session, session.organizationId, parsed.data);
  } catch (error) {
    if (error instanceof AcademicLevelError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/academic-levels");
  return { success: true };
}

export async function updateAcademicLevelAction(
  academicLevelId: string,
  formData: FormData,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const parsed = AcademicLevelInputSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await updateAcademicLevel(session, session.organizationId, academicLevelId, parsed.data);
  revalidatePath("/admin/academic-levels");
}

export async function moveAcademicLevelAction(academicLevelId: string, direction: "up" | "down") {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await moveAcademicLevel(session, session.organizationId, academicLevelId, direction);
  revalidatePath("/admin/academic-levels");
}

export async function deactivateAcademicLevelAction(academicLevelId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivateAcademicLevel(session, session.organizationId, academicLevelId);
  revalidatePath("/admin/academic-levels");
}

export async function reactivateAcademicLevelAction(academicLevelId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivateAcademicLevel(session, session.organizationId, academicLevelId);
  revalidatePath("/admin/academic-levels");
}
