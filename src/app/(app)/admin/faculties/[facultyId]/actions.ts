"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { updateFaculty, deactivateFaculty, reactivateFaculty, FacultyError } from "@/services/faculty.service";

const UpdateFacultySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(1, { message: "Code is required." }),
});

export interface UpdateFacultyFormState {
  error?: string;
  success?: boolean;
}

/** Bound to `facultyId` via `.bind(null, facultyId)` in the client form. */
export async function updateFacultyAction(
  facultyId: string,
  _prevState: UpdateFacultyFormState | undefined,
  formData: FormData,
): Promise<UpdateFacultyFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = UpdateFacultySchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateFaculty(session, session.organizationId, facultyId, parsed.data);
  } catch (error) {
    if (error instanceof FacultyError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/admin/faculties/${facultyId}`);
  revalidatePath("/admin/faculties");
  return { success: true };
}

export async function deactivateFacultyDetailAction(facultyId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivateFaculty(session, session.organizationId, facultyId);
  revalidatePath(`/admin/faculties/${facultyId}`);
  revalidatePath("/admin/faculties");
}

export async function reactivateFacultyDetailAction(facultyId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivateFaculty(session, session.organizationId, facultyId);
  revalidatePath(`/admin/faculties/${facultyId}`);
  revalidatePath("/admin/faculties");
}
