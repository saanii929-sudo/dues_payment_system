import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { UserRole, Role, Department } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { assignRole, revokeRoleAssignment, RoleAssignmentError } from "./role-assignment.service";
import { DEPARTMENT_ROLES, ROLES } from "@/lib/permissions/roles";
import type { Role as RoleKey, SessionUser } from "@/lib/permissions/roles";

export class DepartmentExecutiveError extends Error {}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

async function loadDepartmentForManagement(organizationId: string, departmentId: string) {
  await connectToDatabase();
  const department = await Department.findOne({ _id: departmentId, organizationId });
  if (!department) {
    throw new DepartmentExecutiveError("Department not found.");
  }
  return department;
}

async function assertNoActiveHod(organizationId: string, departmentId: string): Promise<void> {
  const existing = await UserRole.findOne({
    organizationId,
    departmentId,
    roleKey: "DEPT_HOD",
    isActive: true,
  }).populate<{ userId: { fullName: string } | null }>("userId");
  if (existing) {
    throw new DepartmentExecutiveError(
      `This department already has an active HOD (${existing.userId?.fullName ?? "unknown"}). Change or remove them first.`,
    );
  }
}

export interface DepartmentExecutiveSummary {
  userRoleId: string;
  userId: string;
  role: RoleKey;
  fullName: string;
  email: string;
  accountActive: boolean;
  assignedAt: Date;
}

export async function listDepartmentExecutives(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
): Promise<DepartmentExecutiveSummary[]> {
  const department = await loadDepartmentForManagement(organizationId, departmentId);
  assertCan(actor, "department:manage", {
    organizationId,
    facultyId: department.facultyId.toString(),
  });
  await connectToDatabase();

  const roles = await UserRole.find({
    organizationId,
    departmentId,
    isActive: true,
    roleKey: { $in: DEPARTMENT_ROLES },
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

export interface DepartmentExecutiveHistoryEntry {
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

export async function listDepartmentExecutiveHistory(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
): Promise<DepartmentExecutiveHistoryEntry[]> {
  const department = await loadDepartmentForManagement(organizationId, departmentId);
  assertCan(actor, "department:manage", {
    organizationId,
    facultyId: department.facultyId.toString(),
  });
  await connectToDatabase();

  const roles = await UserRole.find({
    organizationId,
    departmentId,
    roleKey: { $in: DEPARTMENT_ROLES },
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

export interface CreateDepartmentExecutiveInput {
  email: string;
  fullName: string;
  role: RoleKey;
}

export async function createDepartmentExecutive(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
  input: CreateDepartmentExecutiveInput,
  appBaseUrl: string,
): Promise<void> {
  const department = await loadDepartmentForManagement(organizationId, departmentId);
  assertCan(actor, "department:manage", {
    organizationId,
    facultyId: department.facultyId.toString(),
  });
  await connectToDatabase();

  if (!DEPARTMENT_ROLES.includes(input.role)) {
    throw new DepartmentExecutiveError("That role is not a department executive role.");
  }

  if (input.role === ROLES.DEPT_HOD) {
    await assertNoActiveHod(organizationId, departmentId);
  }

  try {
    await assignRole(
      actor,
      organizationId,
      { email: input.email, fullName: input.fullName, role: input.role, departmentId },
      appBaseUrl,
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DepartmentExecutiveError(
        "This department already has an active HOD. Change or remove them first.",
      );
    }
    if (error instanceof RoleAssignmentError) {
      throw new DepartmentExecutiveError(error.message);
    }
    throw error;
  }
}

export async function changeDepartmentExecutiveRole(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
  userRoleId: string,
  newRole: RoleKey,
): Promise<void> {
  const department = await loadDepartmentForManagement(organizationId, departmentId);
  assertCan(actor, "department:manage", {
    organizationId,
    facultyId: department.facultyId.toString(),
  });
  await connectToDatabase();

  if (!DEPARTMENT_ROLES.includes(newRole)) {
    throw new DepartmentExecutiveError("That role is not a department executive role.");
  }

  const current = await UserRole.findOne({
    _id: userRoleId,
    organizationId,
    departmentId,
    isActive: true,
    roleKey: { $in: DEPARTMENT_ROLES },
  });
  if (!current) {
    throw new DepartmentExecutiveError("Executive assignment not found.");
  }
  if (current.roleKey === newRole) {
    throw new DepartmentExecutiveError(`This person is already ${newRole}.`);
  }

  if (newRole === ROLES.DEPT_HOD) {
    await assertNoActiveHod(organizationId, departmentId);
  }

  const roleDoc = await Role.findOne({ key: newRole });
  if (!roleDoc) {
    throw new DepartmentExecutiveError(`${newRole} role missing from the role catalog.`);
  }

  const updated = await UserRole.findOneAndUpdate(
    { _id: current._id, isActive: true },
    { $set: { isActive: false, revokedAt: new Date(), revokedById: actor.userId } },
  );
  if (!updated) {
    throw new DepartmentExecutiveError("This assignment was already changed by another action.");
  }

  try {
    await UserRole.create({
      userId: current.userId,
      roleId: roleDoc._id,
      roleKey: newRole,
      organizationId,
      departmentId,
      facultyId: department.facultyId,
      isActive: true,
      assignedById: actor.userId,
      assignedAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DepartmentExecutiveError(
        "This department already has an active HOD. Change or remove them first.",
      );
    }
    throw error;
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "department-executive.role_changed",
    targetType: "User",
    targetId: current.userId.toString(),
    metadata: { from: current.roleKey, to: newRole, departmentId },
  });
}

export async function removeDepartmentExecutive(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
  userRoleId: string,
): Promise<void> {
  const department = await loadDepartmentForManagement(organizationId, departmentId);
  assertCan(actor, "department:manage", {
    organizationId,
    facultyId: department.facultyId.toString(),
  });
  await connectToDatabase();

  const current = await UserRole.findOne({
    _id: userRoleId,
    organizationId,
    departmentId,
    roleKey: { $in: DEPARTMENT_ROLES },
  });
  if (!current) {
    throw new DepartmentExecutiveError("Executive assignment not found.");
  }

  await revokeRoleAssignment(actor, userRoleId);
}
