"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  updateDepartment,
  deactivateDepartment,
  reactivateDepartment,
  DepartmentError,
} from "@/services/department.service";
import {
  createDepartmentExecutive,
  changeDepartmentExecutiveRole,
  removeDepartmentExecutive,
  DepartmentExecutiveError,
} from "@/services/department-executive.service";
import { deactivateUser, reactivateUser } from "@/services/user.service";
import { DEPARTMENT_ROLES } from "@/lib/permissions/roles";
import type { Role as RoleKey } from "@/lib/permissions/roles";

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

// ---------------------------------------------------------------------------
// Department executives (Phase 18)
// ---------------------------------------------------------------------------

const DEPARTMENT_ROLE_ENUM = DEPARTMENT_ROLES as [RoleKey, ...RoleKey[]];

const CreateExecutiveSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Enter a valid email address." }),
  role: z.enum(DEPARTMENT_ROLE_ENUM),
});

export async function createDepartmentExecutiveAction(
  departmentId: string,
  formData: FormData,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const parsed = CreateExecutiveSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  try {
    await createDepartmentExecutive(
      session,
      session.organizationId,
      departmentId,
      parsed.data,
      `${protocol}://${host}`,
    );
  } catch (error) {
    if (error instanceof DepartmentExecutiveError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/admin/departments/${departmentId}`);
}

const ChangeRoleSchema = z.object({
  role: z.enum(DEPARTMENT_ROLE_ENUM),
});

export async function changeDepartmentExecutiveRoleAction(
  departmentId: string,
  userRoleId: string,
  formData: FormData,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const parsed = ChangeRoleSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await changeDepartmentExecutiveRole(
      session,
      session.organizationId,
      departmentId,
      userRoleId,
      parsed.data.role,
    );
  } catch (error) {
    if (error instanceof DepartmentExecutiveError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/admin/departments/${departmentId}`);
}

export async function removeDepartmentExecutiveAction(
  departmentId: string,
  userRoleId: string,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  try {
    await removeDepartmentExecutive(session, session.organizationId, departmentId, userRoleId);
  } catch (error) {
    if (error instanceof DepartmentExecutiveError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/admin/departments/${departmentId}`);
}

export async function deactivateDepartmentExecutiveAccountAction(
  departmentId: string,
  userId: string,
): Promise<void> {
  const session = await verifySession();
  await deactivateUser(session, userId);
  revalidatePath(`/admin/departments/${departmentId}`);
}

export async function reactivateDepartmentExecutiveAccountAction(
  departmentId: string,
  userId: string,
): Promise<void> {
  const session = await verifySession();
  await reactivateUser(session, userId);
  revalidatePath(`/admin/departments/${departmentId}`);
}
