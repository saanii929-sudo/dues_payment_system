import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { User, UserRole } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { setEntityActive } from "@/lib/db/scoped-activation";
import type { SessionUser } from "@/lib/permissions/roles";

export interface OrganizationUserSummary {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
}

interface PopulatedUser {
  _id: { toString(): string };
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt?: Date;
}

export async function listOrganizationUsers(
  actor: SessionUser,
  organizationId: string,
): Promise<OrganizationUserSummary[]> {
  assertCan(actor, "user:manage", { organizationId });
  await connectToDatabase();

  const userRoles = await UserRole.find({ organizationId, isActive: true })
    .populate<{ userId: PopulatedUser }>("userId")
    .sort({ assignedAt: -1 });

  return userRoles
    .filter((userRole) => Boolean(userRole.userId))
    .map((userRole) => ({
      userId: userRole.userId._id.toString(),
      email: userRole.userId.email,
      fullName: userRole.userId.fullName,
      role: userRole.roleKey,
      isActive: userRole.userId.isActive,
      lastLoginAt: userRole.userId.lastLoginAt ?? null,
    }));
}

async function setUserActive(
  actor: SessionUser,
  userId: string,
  isActive: boolean,
): Promise<void> {
  await connectToDatabase();

  const targetRole = await UserRole.findOne({ userId, isActive: true });
  assertCan(actor, "user:manage", {
    organizationId: targetRole?.organizationId?.toString(),
  });

  const updated = await setEntityActive(User, userId, isActive, actor.userId);
  if (!updated) {
    throw new Error("User not found.");
  }

  await recordAudit({
    organizationId: targetRole?.organizationId?.toString(),
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "user.reactivated" : "user.deactivated",
    targetType: "User",
    targetId: userId,
  });
}

export async function deactivateUser(actor: SessionUser, userId: string): Promise<void> {
  await setUserActive(actor, userId, false);
}

export async function reactivateUser(actor: SessionUser, userId: string): Promise<void> {
  await setUserActive(actor, userId, true);
}

export interface CurrentUserProfile {
  email: string;
  fullName: string;
}

/** Self-service lookup for the signed-in user's own display info — no capability check needed. */
export async function getCurrentUserProfile(user: SessionUser): Promise<CurrentUserProfile> {
  await connectToDatabase();
  const record = await User.findById(user.userId);
  if (!record) {
    throw new Error("User not found.");
  }
  return { email: record.email, fullName: record.fullName };
}
