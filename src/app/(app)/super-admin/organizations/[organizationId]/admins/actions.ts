"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import {
  assignOrgAdmin,
  revokeOrgAdmin,
  OrganizationError,
} from "@/services/organization.service";

const AssignAdminSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Enter a valid email address." }),
});

export interface AssignAdminFormState {
  error?: string;
  success?: boolean;
}

/** Bound to `organizationId` via `.bind(null, organizationId)` in the client form. */
export async function assignOrgAdminAction(
  organizationId: string,
  _prevState: AssignAdminFormState | undefined,
  formData: FormData,
): Promise<AssignAdminFormState> {
  const session = await verifySession();
  const parsed = AssignAdminSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  try {
    await assignOrgAdmin(session, organizationId, parsed.data, `${protocol}://${host}`);
  } catch (error) {
    if (error instanceof OrganizationError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/super-admin/organizations/${organizationId}/admins`);
  return { success: true };
}

export async function revokeOrgAdminAction(userRoleId: string, organizationId: string) {
  const actor = await verifySession();
  await revokeOrgAdmin(actor, userRoleId);
  revalidatePath(`/super-admin/organizations/${organizationId}/admins`);
}
