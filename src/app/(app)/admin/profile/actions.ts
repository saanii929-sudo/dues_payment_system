"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { updateOrganizationProfile, OrganizationError } from "@/services/organization.service";

const UpdateProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contactEmail: z.string().email({ message: "Enter a valid email address." }),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export interface UpdateProfileFormState {
  error?: string;
  success?: boolean;
}

export async function updateOrganizationProfileAction(
  _prevState: UpdateProfileFormState | undefined,
  formData: FormData,
): Promise<UpdateProfileFormState> {
  const session = await verifySession();
  if (!session.organizationId) {
    return { error: "No organization in scope." };
  }

  const parsed = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    address: formData.get("address") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateOrganizationProfile(session, session.organizationId, parsed.data);
  } catch (error) {
    if (error instanceof OrganizationError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/profile");
  return { success: true };
}
