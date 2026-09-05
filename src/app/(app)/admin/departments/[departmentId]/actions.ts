"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  updateDepartment,
  deactivateDepartment,
  reactivateDepartment,
  DepartmentError,
} from "@/services/department.service";

const UpdateDepartmentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(1, { message: "Code is required." }),
  facultyId: z.string().min(1, { message: "Select a faculty." }),
});

export interface UpdateDepartmentFormState {
  error?: string;
  success?: boolean;
}

/** Bound to `departmentId` via `.bind(null, departmentId)` in the client form. */
export async function updateDepartmentAction(
  departmentId: string,
  _prevState: UpdateDepartmentFormState | undefined,
  formData: FormData,
): Promise<UpdateDepartmentFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = UpdateDepartmentSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    facultyId: formData.get("facultyId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateDepartment(session, session.organizationId, departmentId, parsed.data);
  } catch (error) {
    if (error instanceof DepartmentError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/admin/departments/${departmentId}`);
  revalidatePath("/admin/departments");
  return { success: true };
}

export async function deactivateDepartmentDetailAction(departmentId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await deactivateDepartment(session, session.organizationId, departmentId);
  revalidatePath(`/admin/departments/${departmentId}`);
  revalidatePath("/admin/departments");
}

export async function reactivateDepartmentDetailAction(departmentId: string) {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");
  await reactivateDepartment(session, session.organizationId, departmentId);
  revalidatePath(`/admin/departments/${departmentId}`);
  revalidatePath("/admin/departments");
}
