"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/dal";
import { logout } from "@/services/auth.service";

export async function logoutAction() {
  const session = await getSession();
  await logout(session);
  redirect("/login");
}
