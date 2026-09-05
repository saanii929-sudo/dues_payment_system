"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { createOrganization, OrganizationError } from "@/services/organization.service";

const CreateOrganizationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  slug: z
    .string()
    .min(2, { message: "Slug must be at least 2 characters." })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens.",
    }),
  contactEmail: z.string().email({ message: "Enter a valid email address." }),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export interface CreateOrganizationFormState {
  error?: string;
}

export async function createOrganizationAction(
  _prevState: CreateOrganizationFormState | undefined,
  formData: FormData,
): Promise<CreateOrganizationFormState> {
  const session = await verifySession();
  const parsed = CreateOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let organization;
  try {
    organization = await createOrganization(session, parsed.data);
  } catch (error) {
    if (error instanceof OrganizationError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/super-admin/organizations/${organization.organizationId}`);
}
