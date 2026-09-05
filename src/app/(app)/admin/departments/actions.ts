"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  createDepartment,
  deactivateDepartment,
  reactivateDepartment,
  DepartmentError,
} from "@/services/department.service";

const CreateDepartmentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(1, { message: "Code is required." }),
  facultyId: z.string().min(1, { message: "Select a faculty." }),
});

export interface CreateDepartmentFormState {
  error?: string;
  success?: boolean;
}

export async function createDepartmentAction(
  _prevState: CreateDepartmentFormState | undefined,
  formData: FormData,
): Promise<CreateDepartmentFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = CreateDepartmentSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    facultyId: formData.get("facultyId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createDepartment(session, session.organizationId, parsed.data);
  } catch (error) {
    if (error instanceof DepartmentError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/departments");
  return { success: true };
}

export async function deactivateDepartmentAction(departmentId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivateDepartment(session, session.organizationId, departmentId);
  revalidatePath("/admin/departments");
}

export async function reactivateDepartmentAction(departmentId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivateDepartment(session, session.organizationId, departmentId);
  revalidatePath("/admin/departments");
}
