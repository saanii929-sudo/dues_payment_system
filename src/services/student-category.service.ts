import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { StudentCategory } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { setEntityActive } from "@/lib/db/scoped-activation";
import { escapeRegExp } from "@/lib/db/escape-regex";
import type { SessionUser } from "@/lib/permissions/roles";

export class StudentCategoryError extends Error {}

export interface StudentCategorySummary {
  studentCategoryId: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateStudentCategoryInput {
  name: string;
  code: string;
  sortOrder: number;
}

/** Case-insensitive, excludes `excludeStudentCategoryId` when checking during an edit. */
async function assertUniqueStudentCategoryName(
  organizationId: string,
  name: string,
  excludeStudentCategoryId?: string,
): Promise<void> {
  const existing = await StudentCategory.findOne({
    organizationId,
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
    ...(excludeStudentCategoryId ? { _id: { $ne: excludeStudentCategoryId } } : {}),
  });
  if (existing) {
    throw new StudentCategoryError("A student category with this name already exists.");
  }
}

export async function createStudentCategory(
  actor: SessionUser,
  organizationId: string,
  input: CreateStudentCategoryInput,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniqueStudentCategoryName(organizationId, name);
  const existingCode = await StudentCategory.findOne({ organizationId, code });
  if (existingCode) {
    throw new StudentCategoryError("A student category with this code already exists.");
  }

  const category = await StudentCategory.create({
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
    action: "student-category.created",
    targetType: "StudentCategory",
    targetId: category._id.toString(),
  });
}

export interface UpdateStudentCategoryInput {
  name: string;
  code: string;
  sortOrder: number;
}

export async function updateStudentCategory(
  actor: SessionUser,
  organizationId: string,
  studentCategoryId: string,
  input: UpdateStudentCategoryInput,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniqueStudentCategoryName(organizationId, name, studentCategoryId);
  const existingCode = await StudentCategory.findOne({
    organizationId,
    code,
    _id: { $ne: studentCategoryId },
  });
  if (existingCode) {
    throw new StudentCategoryError("A student category with this code already exists.");
  }

  const updated = await StudentCategory.findOneAndUpdate(
    { _id: studentCategoryId, organizationId },
    { name, code, sortOrder: input.sortOrder, updatedById: actor.userId },
  );
  if (!updated) {
    throw new StudentCategoryError("Student category not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "student-category.updated",
    targetType: "StudentCategory",
    targetId: studentCategoryId,
  });
}

export async function listStudentCategories(
  actor: SessionUser,
  organizationId: string,
): Promise<StudentCategorySummary[]> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const categories = await StudentCategory.find({ organizationId }).sort({
    sortOrder: 1,
    name: 1,
  });
  return categories.map((category) => ({
    studentCategoryId: category._id.toString(),
    name: category.name,
    code: category.code,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdAt: category.createdAt,
  }));
}

/**
 * Swaps the category with its adjacent row in display order, then renumbers
 * the whole list sequentially (0..n-1) — a plain swap of raw `sortOrder`
 * values would be a no-op whenever two rows already share a value (e.g. rows
 * created before this field was consistently set).
 */
export async function moveStudentCategory(
  actor: SessionUser,
  organizationId: string,
  studentCategoryId: string,
  direction: "up" | "down",
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const categories = await StudentCategory.find({ organizationId }).sort({
    sortOrder: 1,
    name: 1,
  });
  const index = categories.findIndex(
    (category) => category._id.toString() === studentCategoryId,
  );
  if (index === -1) {
    throw new StudentCategoryError("Student category not found.");
  }

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= categories.length) {
    return;
  }

  const reordered = [...categories];
  [reordered[index], reordered[neighborIndex]] = [reordered[neighborIndex], reordered[index]];

  await Promise.all(
    reordered.map((category, position) =>
      category.sortOrder === position
        ? Promise.resolve()
        : StudentCategory.updateOne(
            { _id: category._id },
            { sortOrder: position, updatedById: actor.userId },
          ),
    ),
  );

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "student-category.reordered",
    targetType: "StudentCategory",
    targetId: studentCategoryId,
  });
}

async function setStudentCategoryActive(
  actor: SessionUser,
  organizationId: string,
  studentCategoryId: string,
  isActive: boolean,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const updated = await setEntityActive(
    StudentCategory,
    studentCategoryId,
    isActive,
    actor.userId,
  );
  if (!updated) {
    throw new StudentCategoryError("Student category not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "student-category.reactivated" : "student-category.deactivated",
    targetType: "StudentCategory",
    targetId: studentCategoryId,
  });
}

export async function deactivateStudentCategory(
  actor: SessionUser,
  organizationId: string,
  studentCategoryId: string,
): Promise<void> {
  await setStudentCategoryActive(actor, organizationId, studentCategoryId, false);
}

export async function reactivateStudentCategory(
  actor: SessionUser,
  organizationId: string,
  studentCategoryId: string,
): Promise<void> {
  await setStudentCategoryActive(actor, organizationId, studentCategoryId, true);
}
