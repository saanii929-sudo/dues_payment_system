import "@/lib/serverOnly";
import crypto from "node:crypto";
import { connectToDatabase } from "@/lib/db/connection";
import { User, UserRole, Role, Faculty, Department } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { hashPassword } from "@/lib/auth/password";
import { requestPasswordReset } from "./auth.service";
import { ROLES, FACULTY_ROLES, DEPARTMENT_ROLES } from "@/lib/permissions/roles";
import type { Role as RoleKey, SessionUser } from "@/lib/permissions/roles";

export class RoleAssignmentError extends Error {}

const ASSIGNABLE_ORG_SCOPED_ROLES: RoleKey[] = [
  ROLES.ORG_ADMIN,
  ...FACULTY_ROLES,
  ...DEPARTMENT_ROLES,
];

export interface AssignRoleInput {
  email: string;
  fullName: string;
  role: RoleKey;
  facultyId?: string;
  departmentId?: string;
}

export async function assignRole(
  actor: SessionUser,
  organizationId: string,
  input: AssignRoleInput,
  appBaseUrl: string,
): Promise<void> {
  assertCan(actor, "user:manage", { organizationId });
  await connectToDatabase();

  if (!ASSIGNABLE_ORG_SCOPED_ROLES.includes(input.role)) {
    throw new RoleAssignmentError("That role cannot be assigned within an organization.");
  }

  let facultyId: string | undefined;
  let departmentId: string | undefined;

  if (FACULTY_ROLES.includes(input.role)) {
    if (!input.facultyId) {
      throw new RoleAssignmentError("Select a faculty for this role.");
    }
    const faculty = await Faculty.findOne({ _id: input.facultyId, organizationId });
    if (!faculty) {
      throw new RoleAssignmentError("Faculty not found in this organization.");
    }
    facultyId = faculty._id.toString();
  } else if (DEPARTMENT_ROLES.includes(input.role)) {
    if (!input.departmentId) {
      throw new RoleAssignmentError("Select a department for this role.");
    }
    const department = await Department.findOne({ _id: input.departmentId, organizationId });
    if (!department) {
      throw new RoleAssignmentError("Department not found in this organization.");
    }
    departmentId = department._id.toString();
    facultyId = department.facultyId.toString();
  }

  const email = input.email.toLowerCase().trim();
  let user = await User.findOne({ email });

  if (user) {
    const existingActiveRole = await UserRole.findOne({ userId: user._id, isActive: true });
    if (existingActiveRole) {
      throw new RoleAssignmentError(
        "This user already has an active role. Revoke it before assigning a new one.",
      );
    }
  } else {
    const unusablePassword = crypto.randomBytes(32).toString("hex");
    user = await User.create({
      email,
      fullName: input.fullName.trim(),
      passwordHash: await hashPassword(unusablePassword),
      mustResetPassword: true,
      createdById: actor.userId,
    });
  }

  const roleDoc = await Role.findOne({ key: input.role });
  if (!roleDoc) {
    throw new RoleAssignmentError(`${input.role} role missing from the role catalog.`);
  }

  await UserRole.create({
    userId: user._id,
    roleId: roleDoc._id,
    roleKey: input.role,
    organizationId,
    facultyId,
    departmentId,
    isActive: true,
    assignedById: actor.userId,
    assignedAt: new Date(),
  });

  await requestPasswordReset(email, appBaseUrl);

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "organization.role_assigned",
    targetType: "User",
    targetId: user._id.toString(),
    metadata: { role: input.role },
  });
}

export async function revokeRoleAssignment(
  actor: SessionUser,
  userRoleId: string,
): Promise<void> {
  await connectToDatabase();

  const userRole = await UserRole.findById(userRoleId);
  if (!userRole) {
    throw new RoleAssignmentError("Assignment not found.");
  }

  assertCan(actor, "user:manage", {
    organizationId: userRole.organizationId?.toString(),
  });

  await UserRole.findByIdAndUpdate(userRoleId, {
    isActive: false,
    revokedAt: new Date(),
    revokedById: actor.userId,
  });

  await recordAudit({
    organizationId: userRole.organizationId?.toString(),
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "organization.role_revoked",
    targetType: "User",
    targetId: userRole.userId.toString(),
    metadata: { role: userRole.roleKey },
  });
}

export interface RoleAssignmentSummary {
  userRoleId: string;
  userId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  role: RoleKey;
  facultyId: string | null;
  facultyName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  assignedAt: Date;
}

export async function listOrganizationRoleAssignments(
  actor: SessionUser,
  organizationId: string,
): Promise<RoleAssignmentSummary[]> {
  assertCan(actor, "user:manage", { organizationId });
  await connectToDatabase();

  const roles = await UserRole.find({ organizationId, isActive: true })
    .populate<{
      userId: {
        _id: { toString(): string };
        email: string;
        fullName: string;
        isActive: boolean;
        lastLoginAt?: Date;
      };
      facultyId?: { _id: { toString(): string }; name: string } | null;
      departmentId?: { _id: { toString(): string }; name: string } | null;
    }>(["userId", "facultyId", "departmentId"])
    .sort({ assignedAt: -1 });

  return roles
    .filter((role) => Boolean(role.userId))
    .map((role) => ({
      userRoleId: role._id.toString(),
      isActive: role.userId.isActive,
      lastLoginAt: role.userId.lastLoginAt ?? null,
      userId: role.userId._id.toString(),
      email: role.userId.email,
      fullName: role.userId.fullName,
      role: role.roleKey,
      facultyId: role.facultyId?._id.toString() ?? null,
      facultyName: role.facultyId?.name ?? null,
      departmentId: role.departmentId?._id.toString() ?? null,
      departmentName: role.departmentId?.name ?? null,
      assignedAt: role.assignedAt,
    }));
}
