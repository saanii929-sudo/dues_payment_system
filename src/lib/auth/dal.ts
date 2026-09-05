import "@/lib/serverOnly";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decryptSession, getSessionCookie } from "./session";
import { connectToDatabase } from "@/lib/db/connection";
import { User, UserRole, Organization } from "@/models";
import type { SessionUser } from "@/lib/permissions/roles";

/**
 * Data Access Layer entry point. Memoized per request with React's cache()
 * so every page, Server Action, and Route Handler that calls this shares one
 * database round trip instead of re-querying repeatedly during a single
 * render.
 *
 * Role and scope are loaded fresh from User/UserRole on every call — not
 * trusted from the JWT — so a deactivation or role change takes effect on
 * the very next request. A token issued before the user's last password
 * change is also rejected. An org-scoped session is also denied if its
 * Organization has been deactivated, even though the User/UserRole rows
 * themselves are untouched. See ARCHITECTURE.md "Session truth moves from
 * the JWT to the database" / "Password reset invalidates existing sessions
 * immediately".
 *
 * proxy.ts only does an optimistic cookie-presence redirect and must never
 * be relied on as the real check.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = await getSessionCookie();
  const payload = await decryptSession(token);
  if (!payload) return null;

  const { userId, expiresAt, iat } = payload;
  if (new Date(expiresAt).getTime() < Date.now()) return null;

  await connectToDatabase();

  const user = await User.findById(userId);
  if (!user || !user.isActive) return null;

  if (user.passwordChangedAt && iat && iat * 1000 < user.passwordChangedAt.getTime()) {
    return null;
  }

  const userRole = await UserRole.findOne({ userId: user._id, isActive: true });
  if (!userRole) return null;

  if (userRole.organizationId) {
    const organization = await Organization.findById(userRole.organizationId);
    if (!organization || !organization.isActive) return null;
  }

  return {
    userId: user._id.toString(),
    role: userRole.roleKey,
    organizationId: userRole.organizationId?.toString(),
    facultyId: userRole.facultyId?.toString(),
    departmentId: userRole.departmentId?.toString(),
  };
});

/** Use in pages/layouts that require an authenticated user; redirects otherwise. */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }
  return user;
});
