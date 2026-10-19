import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { RevenueAllocationRule, Department } from "@/models";
import type { FacultyShareType } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import type { SessionUser } from "@/lib/permissions/roles";
import { assertFixedAmountFitsExistingDuesConfigurations } from "./revenue-allocation.service";

export class RevenueRuleError extends Error {}

export interface RevenueRuleSummary {
  ruleId: string;
  name: string;
  paymentPeriodId: string | null;
  paymentPeriodName: string | null;
  facultyId: string | null;
  facultyName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  academicLevelId: string | null;
  academicLevelName: string | null;
  studentCategoryId: string | null;
  studentCategoryName: string | null;
  facultyShareType: FacultyShareType;
  facultyShareAmountPesewas: number | null;
  facultyShareBps: number | null;
  priority: number;
  isActive: boolean;
  createdByName: string | null;
  createdAt: Date;
}

export interface RevenueRuleInput {
  name: string;
  paymentPeriodId?: string;
  facultyId?: string;
  departmentId?: string;
  academicLevelId?: string;
  studentCategoryId?: string;
  facultyShareType: FacultyShareType;
  facultyShareAmountPesewas?: number;
  facultyShareBps?: number;
  priority?: number;
}

async function resolveFacultyId(
  organizationId: string,
  input: Pick<RevenueRuleInput, "facultyId" | "departmentId">,
): Promise<string | undefined> {
  if (!input.departmentId) {
    return input.facultyId || undefined;
  }

  const department = await Department.findOne({ _id: input.departmentId, organizationId });
  if (!department) {
    throw new RevenueRuleError("Department not found in this organization.");
  }

  const departmentFacultyId = department.facultyId.toString();
  if (input.facultyId && input.facultyId !== departmentFacultyId) {
    throw new RevenueRuleError("The selected department does not belong to the selected faculty.");
  }

  return departmentFacultyId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSummary(rule: any): RevenueRuleSummary {
  return {
    ruleId: rule._id.toString(),
    name: rule.name,
    paymentPeriodId: rule.paymentPeriodId?._id.toString() ?? null,
    paymentPeriodName: rule.paymentPeriodId?.name ?? null,
    facultyId: rule.facultyId?._id.toString() ?? null,
    facultyName: rule.facultyId?.name ?? null,
    departmentId: rule.departmentId?._id.toString() ?? null,
    departmentName: rule.departmentId?.name ?? null,
    academicLevelId: rule.academicLevelId?._id.toString() ?? null,
    academicLevelName: rule.academicLevelId?.name ?? null,
    studentCategoryId: rule.studentCategoryId?._id.toString() ?? null,
    studentCategoryName: rule.studentCategoryId?.name ?? null,
    facultyShareType: rule.facultyShareType,
    facultyShareAmountPesewas: rule.facultyShareAmountPesewas ?? null,
    facultyShareBps: rule.facultyShareBps ?? null,
    priority: rule.priority,
    isActive: rule.isActive,
    createdByName: rule.createdById?.fullName ?? null,
    createdAt: rule.createdAt,
  };
}

function validateShareInput(input: RevenueRuleInput): void {
  if (input.facultyShareType === "FIXED") {
    if (!input.facultyShareAmountPesewas || input.facultyShareAmountPesewas <= 0) {
      throw new RevenueRuleError("A fixed Faculty share requires a positive pesewas amount.");
    }
  } else if (
    input.facultyShareBps === undefined ||
    input.facultyShareBps < 0 ||
    input.facultyShareBps > 10000
  ) {
    throw new RevenueRuleError("A percentage Faculty share requires a value between 0 and 10000 bps.");
  }
}

export async function createRevenueRule(
  actor: SessionUser,
  organizationId: string,
  input: RevenueRuleInput,
): Promise<void> {
  assertCan(actor, "revenue:configure", { organizationId });
  await connectToDatabase();

  validateShareInput(input);
  const facultyId = await resolveFacultyId(organizationId, input);

  if (input.facultyShareType === "FIXED" && input.facultyShareAmountPesewas) {
    await assertFixedAmountFitsExistingDuesConfigurations(
      organizationId,
      {
        paymentPeriodId: input.paymentPeriodId,
        facultyId,
        departmentId: input.departmentId,
        academicLevelId: input.academicLevelId,
        studentCategoryId: input.studentCategoryId,
      },
      input.facultyShareAmountPesewas,
      "This rule's fixed Faculty share",
    );
  }

  const rule = await RevenueAllocationRule.create({
    organizationId,
    name: input.name.trim(),
    paymentPeriodId: input.paymentPeriodId || undefined,
    facultyId: facultyId || undefined,
    departmentId: input.departmentId || undefined,
    academicLevelId: input.academicLevelId || undefined,
    studentCategoryId: input.studentCategoryId || undefined,
    facultyShareType: input.facultyShareType,
    facultyShareAmountPesewas:
      input.facultyShareType === "FIXED" ? input.facultyShareAmountPesewas : undefined,
    facultyShareBps: input.facultyShareType === "PERCENTAGE" ? input.facultyShareBps : undefined,
    priority: input.priority ?? 0,
    createdById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "revenue-rule.created",
    targetType: "RevenueAllocationRule",
    targetId: rule._id.toString(),
  });
}

export async function updateRevenueRule(
  actor: SessionUser,
  organizationId: string,
  ruleId: string,
  input: RevenueRuleInput,
): Promise<void> {
  assertCan(actor, "revenue:configure", { organizationId });
  await connectToDatabase();

  const current = await RevenueAllocationRule.findOne({ _id: ruleId, organizationId });
  if (!current) {
    throw new RevenueRuleError("Revenue rule not found.");
  }

  validateShareInput(input);
  const facultyId = await resolveFacultyId(organizationId, input);

  if (input.facultyShareType === "FIXED" && input.facultyShareAmountPesewas) {
    await assertFixedAmountFitsExistingDuesConfigurations(
      organizationId,
      {
        paymentPeriodId: input.paymentPeriodId,
        facultyId,
        departmentId: input.departmentId,
        academicLevelId: input.academicLevelId,
        studentCategoryId: input.studentCategoryId,
      },
      input.facultyShareAmountPesewas,
      "This rule's fixed Faculty share",
    );
  }

  await RevenueAllocationRule.findByIdAndUpdate(ruleId, {
    name: input.name.trim(),
    paymentPeriodId: input.paymentPeriodId || undefined,
    facultyId: facultyId || undefined,
    departmentId: input.departmentId || undefined,
    academicLevelId: input.academicLevelId || undefined,
    studentCategoryId: input.studentCategoryId || undefined,
    facultyShareType: input.facultyShareType,
    facultyShareAmountPesewas:
      input.facultyShareType === "FIXED" ? input.facultyShareAmountPesewas : undefined,
    facultyShareBps: input.facultyShareType === "PERCENTAGE" ? input.facultyShareBps : undefined,
    priority: input.priority ?? 0,
    updatedById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "revenue-rule.updated",
    targetType: "RevenueAllocationRule",
    targetId: ruleId,
  });
}

export async function listRevenueRules(
  actor: SessionUser,
  organizationId: string,
): Promise<RevenueRuleSummary[]> {
  assertCan(actor, "revenue:configure", { organizationId });
  await connectToDatabase();

  const rules = await RevenueAllocationRule.find({ organizationId })
    .populate<{
      paymentPeriodId?: { _id: { toString(): string }; name: string } | null;
      facultyId?: { _id: { toString(): string }; name: string } | null;
      departmentId?: { _id: { toString(): string }; name: string } | null;
      academicLevelId?: { _id: { toString(): string }; name: string } | null;
      studentCategoryId?: { _id: { toString(): string }; name: string } | null;
      createdById?: { fullName: string } | null;
    }>([
      "paymentPeriodId",
      "facultyId",
      "departmentId",
      "academicLevelId",
      "studentCategoryId",
      "createdById",
    ])
    .sort({ createdAt: -1 });

  return rules.map(toSummary);
}

async function setRevenueRuleActive(
  actor: SessionUser,
  organizationId: string,
  ruleId: string,
  isActive: boolean,
): Promise<void> {
  assertCan(actor, "revenue:configure", { organizationId });
  await connectToDatabase();

  const updated = await RevenueAllocationRule.findOneAndUpdate(
    { _id: ruleId, organizationId },
    { isActive, updatedById: actor.userId },
  );
  if (!updated) {
    throw new RevenueRuleError("Revenue rule not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "revenue-rule.reactivated" : "revenue-rule.deactivated",
    targetType: "RevenueAllocationRule",
    targetId: ruleId,
  });
}

export async function deactivateRevenueRule(
  actor: SessionUser,
  organizationId: string,
  ruleId: string,
): Promise<void> {
  await setRevenueRuleActive(actor, organizationId, ruleId, false);
}

export async function reactivateRevenueRule(
  actor: SessionUser,
  organizationId: string,
  ruleId: string,
): Promise<void> {
  await setRevenueRuleActive(actor, organizationId, ruleId, true);
}
