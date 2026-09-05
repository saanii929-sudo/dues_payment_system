"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createFaculty,
  deactivateFaculty,
  reactivateFaculty,
  FacultyError,
} from "@/services/faculty.service";

const CreateFacultySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(1, { message: "Code is required." }),
});

export interface CreateFacultyFormState {
  error?: string;
  success?: boolean;
}

export async function createFacultyAction(
  _prevState: CreateFacultyFormState | undefined,
  formData: FormData,
): Promise<CreateFacultyFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = CreateFacultySchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createFaculty(session, session.organizationId, parsed.data);
  } catch (error) {
    if (error instanceof FacultyError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/faculties");
  return { success: true };
}

export async function deactivateFacultyAction(facultyId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivateFaculty(session, session.organizationId, facultyId);
  revalidatePath("/admin/faculties");
}

export async function reactivateFacultyAction(facultyId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivateFaculty(session, session.organizationId, facultyId);
  revalidatePath("/admin/faculties");
}
