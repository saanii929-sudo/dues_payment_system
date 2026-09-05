"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createStudentCategory,
  updateStudentCategory,
  moveStudentCategory,
  deactivateStudentCategory,
  reactivateStudentCategory,
  StudentCategoryError,
} from "@/services/student-category.service";

const StudentCategoryInputSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(1, { message: "Code is required." }),
  sortOrder: z.coerce.number().int().min(0),
});

export interface CreateStudentCategoryFormState {
  error?: string;
  success?: boolean;
}

export async function createStudentCategoryAction(
  _prevState: CreateStudentCategoryFormState | undefined,
  formData: FormData,
): Promise<CreateStudentCategoryFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = StudentCategoryInputSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createStudentCategory(session, session.organizationId, parsed.data);
  } catch (error) {
    if (error instanceof StudentCategoryError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/student-categories");
  return { success: true };
}

export async function updateStudentCategoryAction(
  studentCategoryId: string,
  formData: FormData,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const parsed = StudentCategoryInputSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await updateStudentCategory(session, session.organizationId, studentCategoryId, parsed.data);
  revalidatePath("/admin/student-categories");
}

export async function moveStudentCategoryAction(
  studentCategoryId: string,
  direction: "up" | "down",
) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await moveStudentCategory(session, session.organizationId, studentCategoryId, direction);
  revalidatePath("/admin/student-categories");
}

export async function deactivateStudentCategoryAction(studentCategoryId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivateStudentCategory(session, session.organizationId, studentCategoryId);
  revalidatePath("/admin/student-categories");
}

export async function reactivateStudentCategoryAction(studentCategoryId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivateStudentCategory(session, session.organizationId, studentCategoryId);
  revalidatePath("/admin/student-categories");
}
