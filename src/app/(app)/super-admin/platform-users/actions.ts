"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { deactivateUser, reactivateUser } from "@/services/user.service";

export async function deactivatePlatformUserAction(userId: string) {
  const actor = await verifySession();
  await deactivateUser(actor, userId);
  revalidatePath("/super-admin/platform-users");
}

export async function reactivatePlatformUserAction(userId: string) {
  const actor = await verifySession();
  await reactivateUser(actor, userId);
  revalidatePath("/super-admin/platform-users");
}
