"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { deactivateUser, reactivateUser } from "@/services/user.service";
import {
  assignRole,
  revokeRoleAssignment,
  RoleAssignmentError,
} from "@/services/role-assignment.service";
import { ROLES, FACULTY_ROLES, DEPARTMENT_ROLES } from "@/lib/permissions/roles";
import type { Role as RoleKey } from "@/lib/permissions/roles";

export async function deactivateUserAction(userId: string) {
  const actor = await verifySession();
  await deactivateUser(actor, userId);
  revalidatePath("/admin/users");
}

export async function reactivateUserAction(userId: string) {
  const actor = await verifySession();
  await reactivateUser(actor, userId);
  revalidatePath("/admin/users");
}

const ASSIGNABLE_ROLES = [
  ROLES.ORG_ADMIN,
  ...FACULTY_ROLES,
  ...DEPARTMENT_ROLES,
] as [RoleKey, ...RoleKey[]];

const AssignRoleSchema = z
  .object({
    fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Enter a valid email address." }),
    role: z.enum(ASSIGNABLE_ROLES),
    facultyId: z.string().optional(),
    departmentId: z.string().optional(),
  })
  .refine(
    (data) => !FACULTY_ROLES.includes(data.role) || Boolean(data.facultyId),
    { message: "Select a faculty for this role.", path: ["facultyId"] },
  )
  .refine(
    (data) => !DEPARTMENT_ROLES.includes(data.role) || Boolean(data.departmentId),
    { message: "Select a department for this role.", path: ["departmentId"] },
  );

export interface AssignRoleFormState {
  error?: string;
  success?: boolean;
}

export async function assignRoleAction(
  _prevState: AssignRoleFormState | undefined,
  formData: FormData,
): Promise<AssignRoleFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = AssignRoleSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    facultyId: formData.get("facultyId") || undefined,
    departmentId: formData.get("departmentId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  try {
    await assignRole(session, session.organizationId, parsed.data, `${protocol}://${host}`);
  } catch (error) {
    if (error instanceof RoleAssignmentError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function revokeRoleAction(userRoleId: string) {
  const actor = await verifySession();
  await revokeRoleAssignment(actor, userRoleId);
  revalidatePath("/admin/users");
}
