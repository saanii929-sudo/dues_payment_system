"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { deactivateOrganization, reactivateOrganization } from "@/services/organization.service";

export async function deactivateOrganizationAction(organizationId: string) {
  const actor = await verifySession();
  await deactivateOrganization(actor, organizationId);
  revalidatePath(`/super-admin/organizations/${organizationId}`);
  revalidatePath("/super-admin/organizations");
}

export async function reactivateOrganizationAction(organizationId: string) {
  const actor = await verifySession();
  await reactivateOrganization(actor, organizationId);
  revalidatePath(`/super-admin/organizations/${organizationId}`);
  revalidatePath("/super-admin/organizations");
}
