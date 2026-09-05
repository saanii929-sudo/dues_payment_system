import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { Department, Faculty, Student, UserRole } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { setEntityActive } from "@/lib/db/scoped-activation";
import { escapeRegExp } from "@/lib/db/escape-regex";
import { DEPARTMENT_ROLES, ROLES } from "@/lib/permissions/roles";
import type { SessionUser } from "@/lib/permissions/roles";

export class DepartmentError extends Error {}

export interface DepartmentSummary {
  departmentId: string;
  name: string;
  code: string;
  facultyId: string;
  facultyName: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  facultyId: string;
}

/** Case-insensitive within the given faculty, excludes `excludeDepartmentId` when checking during an edit. */
async function assertUniqueDepartmentName(
  organizationId: string,
  facultyId: string,
  name: string,
  excludeDepartmentId?: string,
): Promise<void> {
  const existing = await Department.findOne({
    organizationId,
    facultyId,
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
    ...(excludeDepartmentId ? { _id: { $ne: excludeDepartmentId } } : {}),
  });
  if (existing) {
    throw new DepartmentError("A department with this name already exists in this faculty.");
  }
}

/** A department may only belong to an active faculty — see ARCHITECTURE.md Phase 6. */
async function assertActiveFacultyInOrganization(organizationId: string, facultyId: string) {
  const faculty = await Faculty.findOne({ _id: facultyId, organizationId });
  if (!faculty) {
    throw new DepartmentError("Faculty not found in this organization.");
  }
  if (!faculty.isActive) {
    throw new DepartmentError("Cannot assign a department to a deactivated faculty.");
  }
  return faculty;
}

export async function createDepartment(
  actor: SessionUser,
  organizationId: string,
  input: CreateDepartmentInput,
): Promise<void> {
  assertCan(actor, "department:manage", { organizationId, facultyId: input.facultyId });
  await connectToDatabase();

  await assertActiveFacultyInOrganization(organizationId, input.facultyId);

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniqueDepartmentName(organizationId, input.facultyId, name);
  const existingCode = await Department.findOne({
    organizationId,
    facultyId: input.facultyId,
    code,
  });
  if (existingCode) {
    throw new DepartmentError("A department with this code already exists in this faculty.");
  }

  const department = await Department.create({
    organizationId,
    facultyId: input.facultyId,
    name,
    code,
    createdById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "department.created",
    targetType: "Department",
    targetId: department._id.toString(),
  });
}

export interface UpdateDepartmentInput {
  name: string;
  code: string;
  facultyId: string;
}

export async function updateDepartment(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
  input: UpdateDepartmentInput,
): Promise<void> {
  const department = await Department.findOne({ _id: departmentId, organizationId });
  if (!department) {
    throw new DepartmentError("Department not found.");
  }

  assertCan(actor, "department:manage", {
    organizationId,
    facultyId: department.facultyId.toString(),
  });
  await connectToDatabase();

  await assertActiveFacultyInOrganization(organizationId, input.facultyId);

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniqueDepartmentName(organizationId, input.facultyId, name, departmentId);
  const existingCode = await Department.findOne({
    organizationId,
    facultyId: input.facultyId,
    code,
    _id: { $ne: departmentId },
  });
  if (existingCode) {
    throw new DepartmentError("A department with this code already exists in this faculty.");
  }

  await Department.findByIdAndUpdate(departmentId, {
    name,
    code,
    facultyId: input.facultyId,
    updatedById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "department.updated",
    targetType: "Department",
    targetId: departmentId,
  });
}

export async function listDepartments(
  actor: SessionUser,
  organizationId: string,
): Promise<DepartmentSummary[]> {
  assertCan(actor, "department:manage", { organizationId });
  await connectToDatabase();

  const departments = await Department.find({ organizationId })
    .populate<{ facultyId: { _id: { toString(): string }; name: string } }>("facultyId")
    .sort({ name: 1 });

  return departments
    .filter((department) => Boolean(department.facultyId))
    .map((department) => ({
      departmentId: department._id.toString(),
      name: department.name,
      code: department.code,
      facultyId: department.facultyId._id.toString(),
      facultyName: department.facultyId.name,
      isActive: department.isActive,
      createdAt: department.createdAt,
    }));
}

export interface DepartmentExecutive {
  userRoleId: string;
  role: string;
  fullName: string;
  email: string;
}

export interface DepartmentDetails extends DepartmentSummary {
  studentCount: number;
  hod: DepartmentExecutive | null;
  executives: DepartmentExecutive[];
}

export async function getDepartmentDetails(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
): Promise<DepartmentDetails> {
  assertCan(actor, "department:manage", { organizationId });
  await connectToDatabase();

  const [department, studentCount, executiveRoles] = await Promise.all([
    Department.findOne({ _id: departmentId, organizationId }).populate<{
      facultyId: { _id: { toString(): string }; name: string };
    }>("facultyId"),
    Student.countDocuments({ organizationId, departmentId }),
    UserRole.find({
      organizationId,
      departmentId,
      isActive: true,
      roleKey: { $in: DEPARTMENT_ROLES },
    }).populate<{ userId: { email: string; fullName: string } }>("userId"),
  ]);

  if (!department || !department.facultyId) {
    throw new DepartmentError("Department not found.");
  }

  const executives = executiveRoles
    .filter((role) => Boolean(role.userId))
    .map((role) => ({
      userRoleId: role._id.toString(),
      role: role.roleKey,
      fullName: role.userId.fullName,
      email: role.userId.email,
    }));

  return {
    departmentId: department._id.toString(),
    name: department.name,
    code: department.code,
    facultyId: department.facultyId._id.toString(),
    facultyName: department.facultyId.name,
    isActive: department.isActive,
    createdAt: department.createdAt,
    studentCount,
    hod: executives.find((executive) => executive.role === ROLES.DEPT_HOD) ?? null,
    executives,
  };
}

async function setDepartmentActive(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
  isActive: boolean,
): Promise<void> {
  await connectToDatabase();

  const department = await Department.findOne({ _id: departmentId, organizationId });
  if (!department) {
    throw new DepartmentError("Department not found.");
  }
  assertCan(actor, "department:manage", {
    organizationId,
    facultyId: department.facultyId.toString(),
  });

  await setEntityActive(Department, departmentId, isActive, actor.userId);

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "department.reactivated" : "department.deactivated",
    targetType: "Department",
    targetId: departmentId,
  });
}

export async function deactivateDepartment(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
): Promise<void> {
  await setDepartmentActive(actor, organizationId, departmentId, false);
}

export async function reactivateDepartment(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
): Promise<void> {
  await setDepartmentActive(actor, organizationId, departmentId, true);
}
