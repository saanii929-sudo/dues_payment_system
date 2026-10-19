import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { UserRole, Role, Faculty } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { assignRole, revokeRoleAssignment, RoleAssignmentError } from "./role-assignment.service";
import { FACULTY_ROLES, ROLES } from "@/lib/permissions/roles";
import type { Role as RoleKey, SessionUser } from "@/lib/permissions/roles";

export class FacultyExecutiveError extends Error {}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

async function assertNoActiveDean(organizationId: string, facultyId: string): Promise<void> {
  const existing = await UserRole.findOne({
    organizationId,
    facultyId,
    roleKey: "FACULTY_DEAN",
    isActive: true,
  }).populate<{ userId: { fullName: string } | null }>("userId");
  if (existing) {
    throw new FacultyExecutiveError(
      `This faculty already has an active Dean (${existing.userId?.fullName ?? "unknown"}). Change or remove them first.`,
    );
  }
}

export interface FacultyExecutiveSummary {
  userRoleId: string;
  userId: string;
  role: RoleKey;
  fullName: string;
  email: string;
  accountActive: boolean;
  assignedAt: Date;
}

export async function listFacultyExecutives(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
): Promise<FacultyExecutiveSummary[]> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  const roles = await UserRole.find({
    organizationId,
    facultyId,
    isActive: true,
    roleKey: { $in: FACULTY_ROLES },
  })
    .populate<{
      userId: { _id: { toString(): string }; fullName: string; email: string; isActive: boolean } | null;
    }>("userId")
    .sort({ assignedAt: -1 });

  return roles
    .filter((role) => Boolean(role.userId))
    .map((role) => ({
      userRoleId: role._id.toString(),
      userId: role.userId!._id.toString(),
      role: role.roleKey,
      fullName: role.userId!.fullName,
      email: role.userId!.email,
      accountActive: role.userId!.isActive,
      assignedAt: role.assignedAt,
    }));
}

export interface FacultyExecutiveHistoryEntry {
  userRoleId: string;
  role: RoleKey;
  fullName: string;
  email: string;
  status: "ACTIVE" | "REVOKED";
  assignedAt: Date;
  assignedByName: string | null;
  revokedAt: Date | null;
  revokedByName: string | null;
}

export async function listFacultyExecutiveHistory(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
): Promise<FacultyExecutiveHistoryEntry[]> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  const roles = await UserRole.find({
    organizationId,
    facultyId,
    roleKey: { $in: FACULTY_ROLES },
  })
    .populate<{
      userId: { fullName: string; email: string } | null;
      assignedById?: { fullName: string } | null;
      revokedById?: { fullName: string } | null;
    }>(["userId", "assignedById", "revokedById"])
    .sort({ assignedAt: -1 });

  return roles
    .filter((role) => Boolean(role.userId))
    .map((role) => ({
      userRoleId: role._id.toString(),
      role: role.roleKey,
      fullName: role.userId!.fullName,
      email: role.userId!.email,
      status: role.isActive ? "ACTIVE" : "REVOKED",
      assignedAt: role.assignedAt,
      assignedByName: role.assignedById?.fullName ?? null,
      revokedAt: role.revokedAt ?? null,
      revokedByName: role.revokedById?.fullName ?? null,
    }));
}

export interface CreateFacultyExecutiveInput {
  email: string;
  fullName: string;
  role: RoleKey;
}

export async function createFacultyExecutive(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
  input: CreateFacultyExecutiveInput,
  appBaseUrl: string,
): Promise<void> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  if (!FACULTY_ROLES.includes(input.role)) {
    throw new FacultyExecutiveError("That role is not a faculty executive role.");
  }

  const faculty = await Faculty.findOne({ _id: facultyId, organizationId });
  if (!faculty) {
    throw new FacultyExecutiveError("Faculty not found.");
  }

  if (input.role === ROLES.FACULTY_DEAN) {
    await assertNoActiveDean(organizationId, facultyId);
  }

  try {
    await assignRole(
      actor,
      organizationId,
      { email: input.email, fullName: input.fullName, role: input.role, facultyId },
      appBaseUrl,
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new FacultyExecutiveError(
        "This faculty already has an active Dean. Change or remove them first.",
      );
    }
    if (error instanceof RoleAssignmentError) {
      throw new FacultyExecutiveError(error.message);
    }
    throw error;
  }
}

export async function changeFacultyExecutiveRole(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
  userRoleId: string,
  newRole: RoleKey,
): Promise<void> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  if (!FACULTY_ROLES.includes(newRole)) {
    throw new FacultyExecutiveError("That role is not a faculty executive role.");
  }

  const current = await UserRole.findOne({
    _id: userRoleId,
    organizationId,
    facultyId,
    isActive: true,
    roleKey: { $in: FACULTY_ROLES },
  });
  if (!current) {
    throw new FacultyExecutiveError("Executive assignment not found.");
  }
  if (current.roleKey === newRole) {
    throw new FacultyExecutiveError(`This person is already ${newRole}.`);
  }

  if (newRole === ROLES.FACULTY_DEAN) {
    await assertNoActiveDean(organizationId, facultyId);
  }

  const roleDoc = await Role.findOne({ key: newRole });
  if (!roleDoc) {
    throw new FacultyExecutiveError(`${newRole} role missing from the role catalog.`);
  }

  const updated = await UserRole.findOneAndUpdate(
    { _id: current._id, isActive: true },
    { $set: { isActive: false, revokedAt: new Date(), revokedById: actor.userId } },
  );
  if (!updated) {
    throw new FacultyExecutiveError("This assignment was already changed by another action.");
  }

  try {
    await UserRole.create({
      userId: current.userId,
      roleId: roleDoc._id,
      roleKey: newRole,
      organizationId,
      facultyId,
      isActive: true,
      assignedById: actor.userId,
      assignedAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new FacultyExecutiveError(
        "This faculty already has an active Dean. Change or remove them first.",
      );
    }
    throw error;
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "faculty-executive.role_changed",
    targetType: "User",
    targetId: current.userId.toString(),
    metadata: { from: current.roleKey, to: newRole, facultyId },
  });
}

export async function removeFacultyExecutive(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
  userRoleId: string,
): Promise<void> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  const current = await UserRole.findOne({
    _id: userRoleId,
    organizationId,
    facultyId,
    roleKey: { $in: FACULTY_ROLES },
  });
  if (!current) {
    throw new FacultyExecutiveError("Executive assignment not found.");
  }

  await revokeRoleAssignment(actor, userRoleId);
}
