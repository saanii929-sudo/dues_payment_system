"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { updateFaculty, deactivateFaculty, reactivateFaculty, FacultyError } from "@/services/faculty.service";
import {
  createFacultyExecutive,
  changeFacultyExecutiveRole,
  removeFacultyExecutive,
  FacultyExecutiveError,
} from "@/services/faculty-executive.service";
import { deactivateUser, reactivateUser } from "@/services/user.service";
import { FACULTY_ROLES } from "@/lib/permissions/roles";
import type { Role as RoleKey } from "@/lib/permissions/roles";

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

// ---------------------------------------------------------------------------
// Faculty executives (Phase 17)
// ---------------------------------------------------------------------------

const FACULTY_ROLE_ENUM = FACULTY_ROLES as [RoleKey, ...RoleKey[]];

const CreateExecutiveSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Enter a valid email address." }),
  role: z.enum(FACULTY_ROLE_ENUM),
});

export async function createFacultyExecutiveAction(
  facultyId: string,
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
    await createFacultyExecutive(
      session,
      session.organizationId,
      facultyId,
      parsed.data,
      `${protocol}://${host}`,
    );
  } catch (error) {
    if (error instanceof FacultyExecutiveError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/admin/faculties/${facultyId}`);
}

const ChangeRoleSchema = z.object({
  role: z.enum(FACULTY_ROLE_ENUM),
});

export async function changeFacultyExecutiveRoleAction(
  facultyId: string,
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
    await changeFacultyExecutiveRole(
      session,
      session.organizationId,
      facultyId,
      userRoleId,
      parsed.data.role,
    );
  } catch (error) {
    if (error instanceof FacultyExecutiveError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/admin/faculties/${facultyId}`);
}

export async function removeFacultyExecutiveAction(
  facultyId: string,
  userRoleId: string,
): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  try {
    await removeFacultyExecutive(session, session.organizationId, facultyId, userRoleId);
  } catch (error) {
    if (error instanceof FacultyExecutiveError) throw new Error(error.message);
    throw error;
  }

  revalidatePath(`/admin/faculties/${facultyId}`);
}

export async function deactivateFacultyExecutiveAccountAction(
  facultyId: string,
  userId: string,
): Promise<void> {
  const session = await verifySession();
  await deactivateUser(session, userId);
  revalidatePath(`/admin/faculties/${facultyId}`);
}

export async function reactivateFacultyExecutiveAccountAction(
  facultyId: string,
  userId: string,
): Promise<void> {
  const session = await verifySession();
  await reactivateUser(session, userId);
  revalidatePath(`/admin/faculties/${facultyId}`);
}
