import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { Faculty, Department, Student, UserRole } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { setEntityActive } from "@/lib/db/scoped-activation";
import { escapeRegExp } from "@/lib/db/escape-regex";
import { FACULTY_ROLES } from "@/lib/permissions/roles";
import type { SessionUser } from "@/lib/permissions/roles";

export class FacultyError extends Error {}

export interface FacultySummary {
  facultyId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateFacultyInput {
  name: string;
  code: string;
}

/** Case-insensitive, excludes `excludeFacultyId` when checking during an edit. */
async function assertUniqueFacultyName(
  organizationId: string,
  name: string,
  excludeFacultyId?: string,
): Promise<void> {
  const existing = await Faculty.findOne({
    organizationId,
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
    ...(excludeFacultyId ? { _id: { $ne: excludeFacultyId } } : {}),
  });
  if (existing) {
    throw new FacultyError("A faculty with this name already exists.");
  }
}

export async function createFaculty(
  actor: SessionUser,
  organizationId: string,
  input: CreateFacultyInput,
): Promise<void> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniqueFacultyName(organizationId, name);
  const existingCode = await Faculty.findOne({ organizationId, code });
  if (existingCode) {
    throw new FacultyError("A faculty with this code already exists.");
  }

  const faculty = await Faculty.create({
    organizationId,
    name,
    code,
    createdById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "faculty.created",
    targetType: "Faculty",
    targetId: faculty._id.toString(),
  });
}

export interface UpdateFacultyInput {
  name: string;
  code: string;
}

export async function updateFaculty(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
  input: UpdateFacultyInput,
): Promise<void> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniqueFacultyName(organizationId, name, facultyId);
  const existingCode = await Faculty.findOne({
    organizationId,
    code,
    _id: { $ne: facultyId },
  });
  if (existingCode) {
    throw new FacultyError("A faculty with this code already exists.");
  }

  const updated = await Faculty.findOneAndUpdate(
    { _id: facultyId, organizationId },
    { name, code, updatedById: actor.userId },
  );
  if (!updated) {
    throw new FacultyError("Faculty not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "faculty.updated",
    targetType: "Faculty",
    targetId: facultyId,
  });
}

export async function listFaculties(
  actor: SessionUser,
  organizationId: string,
): Promise<FacultySummary[]> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  const faculties = await Faculty.find({ organizationId }).sort({ name: 1 });
  return faculties.map((faculty) => ({
    facultyId: faculty._id.toString(),
    name: faculty.name,
    code: faculty.code,
    isActive: faculty.isActive,
    createdAt: faculty.createdAt,
  }));
}

export interface FacultyExecutive {
  userRoleId: string;
  role: string;
  fullName: string;
  email: string;
}

export interface FacultyDetails extends FacultySummary {
  departmentCount: number;
  studentCount: number;
  executives: FacultyExecutive[];
}

export async function getFacultyDetails(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
): Promise<FacultyDetails> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  const [faculty, departmentCount, studentCount, executiveRoles] = await Promise.all([
    Faculty.findOne({ _id: facultyId, organizationId }),
    Department.countDocuments({ organizationId, facultyId }),
    Student.countDocuments({ organizationId, facultyId }),
    UserRole.find({
      organizationId,
      facultyId,
      isActive: true,
      roleKey: { $in: FACULTY_ROLES },
    }).populate<{ userId: { email: string; fullName: string } }>("userId"),
  ]);

  if (!faculty) {
    throw new FacultyError("Faculty not found.");
  }

  return {
    facultyId: faculty._id.toString(),
    name: faculty.name,
    code: faculty.code,
    isActive: faculty.isActive,
    createdAt: faculty.createdAt,
    departmentCount,
    studentCount,
    executives: executiveRoles
      .filter((role) => Boolean(role.userId))
      .map((role) => ({
        userRoleId: role._id.toString(),
        role: role.roleKey,
        fullName: role.userId.fullName,
        email: role.userId.email,
      })),
  };
}

async function setFacultyActive(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
  isActive: boolean,
): Promise<void> {
  assertCan(actor, "faculty:manage", { organizationId });
  await connectToDatabase();

  const updated = await setEntityActive(Faculty, facultyId, isActive, actor.userId);
  if (!updated) {
    throw new FacultyError("Faculty not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "faculty.reactivated" : "faculty.deactivated",
    targetType: "Faculty",
    targetId: facultyId,
  });
}

export async function deactivateFaculty(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
): Promise<void> {
  await setFacultyActive(actor, organizationId, facultyId, false);
}

export async function reactivateFaculty(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
): Promise<void> {
  await setFacultyActive(actor, organizationId, facultyId, true);
}
