import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { AcademicLevel } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { setEntityActive } from "@/lib/db/scoped-activation";
import { escapeRegExp } from "@/lib/db/escape-regex";
import type { SessionUser } from "@/lib/permissions/roles";

export class AcademicLevelError extends Error {}

export interface AcademicLevelSummary {
  academicLevelId: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateAcademicLevelInput {
  name: string;
  code: string;
  sortOrder: number;
}

async function assertUniqueAcademicLevelName(
  organizationId: string,
  name: string,
  excludeAcademicLevelId?: string,
): Promise<void> {
  const existing = await AcademicLevel.findOne({
    organizationId,
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
    ...(excludeAcademicLevelId ? { _id: { $ne: excludeAcademicLevelId } } : {}),
  });
  if (existing) {
    throw new AcademicLevelError("An academic level with this name already exists.");
  }
}

export async function createAcademicLevel(
  actor: SessionUser,
  organizationId: string,
  input: CreateAcademicLevelInput,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniqueAcademicLevelName(organizationId, name);
  const existingCode = await AcademicLevel.findOne({ organizationId, code });
  if (existingCode) {
    throw new AcademicLevelError("An academic level with this code already exists.");
  }

  const level = await AcademicLevel.create({
    organizationId,
    name,
    code,
    sortOrder: input.sortOrder,
    createdById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "academic-level.created",
    targetType: "AcademicLevel",
    targetId: level._id.toString(),
  });
}

export interface UpdateAcademicLevelInput {
  name: string;
  code: string;
  sortOrder: number;
}

export async function updateAcademicLevel(
  actor: SessionUser,
  organizationId: string,
  academicLevelId: string,
  input: UpdateAcademicLevelInput,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniqueAcademicLevelName(organizationId, name, academicLevelId);
  const existingCode = await AcademicLevel.findOne({
    organizationId,
    code,
    _id: { $ne: academicLevelId },
  });
  if (existingCode) {
    throw new AcademicLevelError("An academic level with this code already exists.");
  }

  const updated = await AcademicLevel.findOneAndUpdate(
    { _id: academicLevelId, organizationId },
    { name, code, sortOrder: input.sortOrder, updatedById: actor.userId },
  );
  if (!updated) {
    throw new AcademicLevelError("Academic level not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "academic-level.updated",
    targetType: "AcademicLevel",
    targetId: academicLevelId,
  });
}

export async function listAcademicLevels(
  actor: SessionUser,
  organizationId: string,
): Promise<AcademicLevelSummary[]> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const levels = await AcademicLevel.find({ organizationId }).sort({ sortOrder: 1, name: 1 });
  return levels.map((level) => ({
    academicLevelId: level._id.toString(),
    name: level.name,
    code: level.code,
    sortOrder: level.sortOrder,
    isActive: level.isActive,
    createdAt: level.createdAt,
  }));
}

export interface PublicAcademicLevelOption {
  academicLevelId: string;
  name: string;
}


export async function listPublicAcademicLevels(
  organizationId: string,
): Promise<PublicAcademicLevelOption[]> {
  await connectToDatabase();
  const levels = await AcademicLevel.find({ organizationId, isActive: true }).sort({
    sortOrder: 1,
    name: 1,
  });
  return levels.map((level) => ({
    academicLevelId: level._id.toString(),
    name: level.name,
  }));
}


export async function moveAcademicLevel(
  actor: SessionUser,
  organizationId: string,
  academicLevelId: string,
  direction: "up" | "down",
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const levels = await AcademicLevel.find({ organizationId }).sort({ sortOrder: 1, name: 1 });
  const index = levels.findIndex((level) => level._id.toString() === academicLevelId);
  if (index === -1) {
    throw new AcademicLevelError("Academic level not found.");
  }

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= levels.length) {
    return;
  }

  const reordered = [...levels];
  [reordered[index], reordered[neighborIndex]] = [reordered[neighborIndex], reordered[index]];

  await Promise.all(
    reordered.map((level, position) =>
      level.sortOrder === position
        ? Promise.resolve()
        : AcademicLevel.updateOne(
            { _id: level._id },
            { sortOrder: position, updatedById: actor.userId },
          ),
    ),
  );

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "academic-level.reordered",
    targetType: "AcademicLevel",
    targetId: academicLevelId,
  });
}

async function setAcademicLevelActive(
  actor: SessionUser,
  organizationId: string,
  academicLevelId: string,
  isActive: boolean,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const updated = await setEntityActive(AcademicLevel, academicLevelId, isActive, actor.userId);
  if (!updated) {
    throw new AcademicLevelError("Academic level not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "academic-level.reactivated" : "academic-level.deactivated",
    targetType: "AcademicLevel",
    targetId: academicLevelId,
  });
}

export async function deactivateAcademicLevel(
  actor: SessionUser,
  organizationId: string,
  academicLevelId: string,
): Promise<void> {
  await setAcademicLevelActive(actor, organizationId, academicLevelId, false);
}

export async function reactivateAcademicLevel(
  actor: SessionUser,
  organizationId: string,
  academicLevelId: string,
): Promise<void> {
  await setAcademicLevelActive(actor, organizationId, academicLevelId, true);
}
