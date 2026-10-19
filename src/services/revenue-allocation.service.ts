import "@/lib/serverOnly";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import {
  RevenueAllocationRule,
  RevenueDeduction,
  RevenueAllocation,
  DuesConfiguration,
  PaymentPeriod,
} from "@/models";
import type {
  FacultyShareType,
  DeductionType,
  RevenueDeductionStatus,
  RevenueAllocationStatus,
} from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { escapeRegExp } from "@/lib/db/escape-regex";
import { creditWallet, debitWallet } from "@/lib/wallets/ledger";
import type { SessionUser } from "@/lib/permissions/roles";

export class RevenueAllocationError extends Error {}
export class RevenueDistributionError extends Error {}

export interface PaymentForAllocation {
  _id: Types.ObjectId | string;
  organizationId: Types.ObjectId | string;
  paymentPeriodId: Types.ObjectId | string;
  amountPesewas: number;
  clientReference: string;
  studentIndexNumber: string;
  studentSnapshot: {
    facultyId?: Types.ObjectId | string;
    facultyName?: string;
    departmentId?: Types.ObjectId | string;
    departmentName?: string;
    academicLevelId?: Types.ObjectId | string;
    academicLevelName?: string;
    studentCategoryId?: Types.ObjectId | string;
    studentCategoryName?: string;
  };
}

export interface RevenueScope {
  paymentPeriodId?: Types.ObjectId | string;
  facultyId?: Types.ObjectId | string;
  departmentId?: Types.ObjectId | string;
  academicLevelId?: Types.ObjectId | string;
  studentCategoryId?: Types.ObjectId | string;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function scopeQuery(scope: RevenueScope): Record<string, unknown> {
  return {
    paymentPeriodId: { $in: [null, scope.paymentPeriodId ?? null] },
    facultyId: { $in: [null, scope.facultyId ?? null] },
    departmentId: { $in: [null, scope.departmentId ?? null] },
    academicLevelId: { $in: [null, scope.academicLevelId ?? null] },
    studentCategoryId: { $in: [null, scope.studentCategoryId ?? null] },
  };
}

function specificity(entity: {
  paymentPeriodId?: unknown;
  facultyId?: unknown;
  departmentId?: unknown;
  academicLevelId?: unknown;
  studentCategoryId?: unknown;
}): number {
  return [
    entity.paymentPeriodId,
    entity.facultyId,
    entity.departmentId,
    entity.academicLevelId,
    entity.studentCategoryId,
  ].filter(Boolean).length;
}

export interface ApplicableRevenueRule {
  ruleId: string;
  name: string;
  facultyShareType: FacultyShareType;
  facultyShareAmountPesewas?: number;
  facultyShareBps?: number;
}


export async function resolveApplicableRevenueRule(
  organizationId: Types.ObjectId | string,
  scope: RevenueScope,
): Promise<ApplicableRevenueRule | null> {
  await connectToDatabase();

  const candidates = await RevenueAllocationRule.find({
    organizationId,
    isActive: true,
    ...scopeQuery(scope),
  }).sort({ priority: -1, createdAt: -1 });

  if (candidates.length === 0) return null;

  const best = candidates.reduce((top, candidate) =>
    specificity(candidate) > specificity(top) ? candidate : top,
  );

  return {
    ruleId: best._id.toString(),
    name: best.name,
    facultyShareType: best.facultyShareType,
    facultyShareAmountPesewas: best.facultyShareAmountPesewas,
    facultyShareBps: best.facultyShareBps,
  };
}

export interface ApplicableDeduction {
  deductionId: string;
  name: string;
  deductionType: DeductionType;
  amountPesewas?: number;
  percentageBps?: number;
}


export async function resolveApplicableDeductions(
  organizationId: Types.ObjectId | string,
  scope: RevenueScope,
): Promise<ApplicableDeduction[]> {
  await connectToDatabase();

  const deductions = await RevenueDeduction.find({
    organizationId,
    isActive: true,
    status: "APPROVED",
    ...scopeQuery(scope),
  });

  return deductions.map((deduction) => ({
    deductionId: deduction._id.toString(),
    name: deduction.name,
    deductionType: deduction.deductionType,
    amountPesewas: deduction.amountPesewas,
    percentageBps: deduction.percentageBps,
  }));
}

export interface RevenueDistribution {
  facultyShareAmountPesewas: number;
  deductionsTotalPesewas: number;
  departmentShareAmountPesewas: number;
}

function resolveShareAmount(
  totalAmountPesewas: number,
  type: "FIXED" | "PERCENTAGE",
  fixedAmountPesewas: number | undefined,
  bps: number | undefined,
): number {
  if (type === "FIXED") return fixedAmountPesewas ?? 0;
  return Math.round((totalAmountPesewas * (bps ?? 0)) / 10000);
}


export function computeRevenueDistribution(
  totalAmountPesewas: number,
  rule: ApplicableRevenueRule,
  deductions: ApplicableDeduction[],
): RevenueDistribution {
  const facultyShareAmountPesewas = resolveShareAmount(
    totalAmountPesewas,
    rule.facultyShareType,
    rule.facultyShareAmountPesewas,
    rule.facultyShareBps,
  );

  const deductionsTotalPesewas = deductions.reduce(
    (sum, deduction) =>
      sum +
      resolveShareAmount(
        totalAmountPesewas,
        deduction.deductionType,
        deduction.amountPesewas,
        deduction.percentageBps,
      ),
    0,
  );

  if (facultyShareAmountPesewas + deductionsTotalPesewas > totalAmountPesewas) {
    throw new RevenueDistributionError(
      `Faculty share (${facultyShareAmountPesewas}) plus deductions (${deductionsTotalPesewas}) exceeds the payment amount (${totalAmountPesewas}).`,
    );
  }

  return {
    facultyShareAmountPesewas,
    deductionsTotalPesewas,
    departmentShareAmountPesewas:
      totalAmountPesewas - facultyShareAmountPesewas - deductionsTotalPesewas,
  };
}


export async function allocateRevenueForPayment(payment: PaymentForAllocation): Promise<void> {
  await connectToDatabase();

  const scope: RevenueScope = {
    paymentPeriodId: payment.paymentPeriodId,
    facultyId: payment.studentSnapshot.facultyId,
    departmentId: payment.studentSnapshot.departmentId,
    academicLevelId: payment.studentSnapshot.academicLevelId,
    studentCategoryId: payment.studentSnapshot.studentCategoryId,
  };

  const rule = await resolveApplicableRevenueRule(payment.organizationId, scope);
  if (!rule) return; // no revenue rule configured for this scope — nothing to allocate

  const deductions = await resolveApplicableDeductions(payment.organizationId, scope);

  let distribution: RevenueDistribution;
  try {
    distribution = computeRevenueDistribution(payment.amountPesewas, rule, deductions);
  } catch (error) {
    if (error instanceof RevenueDistributionError) {
      await recordAudit({
        organizationId: payment.organizationId.toString(),
        action: "payment.allocation_failed",
        targetType: "Payment",
        targetId: payment._id.toString(),
        metadata: { reason: error.message, ruleId: rule.ruleId },
      });
      return;
    }
    throw error;
  }

  const paymentPeriod = await PaymentPeriod.findById(payment.paymentPeriodId);

  let entry;
  try {
    entry = await RevenueAllocation.create({
      organizationId: payment.organizationId,
      paymentId: payment._id,
      studentIndexNumber: payment.studentIndexNumber,
      facultyId: payment.studentSnapshot.facultyId || undefined,
      facultyName: payment.studentSnapshot.facultyName,
      departmentId: payment.studentSnapshot.departmentId || undefined,
      departmentName: payment.studentSnapshot.departmentName,
      studentCategoryId: payment.studentSnapshot.studentCategoryId || undefined,
      studentCategoryName: payment.studentSnapshot.studentCategoryName,
      academicLevelId: payment.studentSnapshot.academicLevelId || undefined,
      academicLevelName: payment.studentSnapshot.academicLevelName,
      paymentPeriodId: payment.paymentPeriodId,
      paymentPeriodName: paymentPeriod?.name ?? "—",
      totalAmountPesewas: payment.amountPesewas,
      facultyShareAmountPesewas: distribution.facultyShareAmountPesewas,
      departmentShareAmountPesewas: distribution.departmentShareAmountPesewas,
      deductionsTotalPesewas: distribution.deductionsTotalPesewas,
      ruleId: rule.ruleId,
      ruleNameSnapshot: rule.name,
      status: "ALLOCATED",
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return; // already allocated by an earlier attempt
    throw error;
  }

  const facultyId = payment.studentSnapshot.facultyId;
  const departmentId = payment.studentSnapshot.departmentId;

  if (facultyId) {
    await creditWallet(
      "FACULTY",
      payment.organizationId,
      facultyId,
      distribution.facultyShareAmountPesewas,
      "REVENUE_ALLOCATION",
      entry._id,
      `Revenue allocation for payment ${payment.clientReference}`,
    );
  }
  if (departmentId) {
    await creditWallet(
      "DEPARTMENT",
      payment.organizationId,
      departmentId,
      distribution.departmentShareAmountPesewas,
      "REVENUE_ALLOCATION",
      entry._id,
      `Revenue allocation for payment ${payment.clientReference}`,
    );
  }
}


export async function reverseRevenueAllocationsForPayment(
  paymentId: Types.ObjectId | string,
  refundId: Types.ObjectId | string,
): Promise<void> {
  await connectToDatabase();

  const entry = await RevenueAllocation.findOneAndUpdate(
    { paymentId, status: "ALLOCATED" },
    { $set: { status: "REVERSED" } },
    { new: false },
  );
  if (!entry) return; // nothing allocated, or already reversed by an earlier attempt

  if (entry.facultyId) {
    await debitWallet(
      "FACULTY",
      entry.organizationId,
      entry.facultyId,
      entry.facultyShareAmountPesewas,
      "REFUND_REVERSAL",
      refundId,
      `Refund reversal for payment ${paymentId}`,
    );
  }
  if (entry.departmentId) {
    await debitWallet(
      "DEPARTMENT",
      entry.organizationId,
      entry.departmentId,
      entry.departmentShareAmountPesewas,
      "REFUND_REVERSAL",
      refundId,
      `Refund reversal for payment ${paymentId}`,
    );
  }
}

export async function adjustLedgerEntry(
  actor: SessionUser,
  organizationId: string,
  entryId: string,
  input: { newFacultyShareAmountPesewas: number; reason: string },
): Promise<void> {
  assertCan(actor, "ledger:adjust", { organizationId });
  await connectToDatabase();

  const original = await RevenueAllocation.findOne({ _id: entryId, organizationId });
  if (!original) {
    throw new RevenueAllocationError("Ledger entry not found.");
  }
  if (original.status !== "ALLOCATED") {
    throw new RevenueAllocationError(
      `Cannot adjust a ${original.status.toLowerCase()} ledger entry.`,
    );
  }
  if (!input.reason.trim()) {
    throw new RevenueAllocationError("A reason is required to adjust a ledger entry.");
  }
  if (input.newFacultyShareAmountPesewas < 0) {
    throw new RevenueAllocationError("The Faculty share cannot be negative.");
  }

  const newDepartmentShareAmountPesewas =
    original.totalAmountPesewas - input.newFacultyShareAmountPesewas - original.deductionsTotalPesewas;
  if (newDepartmentShareAmountPesewas < 0) {
    throw new RevenueAllocationError(
      `Faculty share (${input.newFacultyShareAmountPesewas}) plus deductions (${original.deductionsTotalPesewas}) would exceed the total paid (${original.totalAmountPesewas}) — this would leave a negative Department allocation.`,
    );
  }

  const updatedOriginal = await RevenueAllocation.findOneAndUpdate(
    { _id: original._id, status: "ALLOCATED" },
    { $set: { status: "ADJUSTED" } },
    { new: false },
  );
  if (!updatedOriginal) {
    throw new RevenueAllocationError("This entry was already adjusted or reversed by another action.");
  }

  const correction = await RevenueAllocation.create({
    organizationId: original.organizationId,
    paymentId: original.paymentId,
    studentIndexNumber: original.studentIndexNumber,
    facultyId: original.facultyId,
    facultyName: original.facultyName,
    departmentId: original.departmentId,
    departmentName: original.departmentName,
    studentCategoryId: original.studentCategoryId,
    studentCategoryName: original.studentCategoryName,
    academicLevelId: original.academicLevelId,
    academicLevelName: original.academicLevelName,
    paymentPeriodId: original.paymentPeriodId,
    paymentPeriodName: original.paymentPeriodName,
    totalAmountPesewas: original.totalAmountPesewas,
    facultyShareAmountPesewas: input.newFacultyShareAmountPesewas,
    departmentShareAmountPesewas: newDepartmentShareAmountPesewas,
    deductionsTotalPesewas: original.deductionsTotalPesewas,
    ruleId: original.ruleId,
    ruleNameSnapshot: original.ruleNameSnapshot,
    status: "ALLOCATED",
    isCorrection: true,
    adjustsEntryId: original._id,
    adjustmentReason: input.reason.trim(),
  });

  const facultyDelta = input.newFacultyShareAmountPesewas - original.facultyShareAmountPesewas;
  const departmentDelta = newDepartmentShareAmountPesewas - original.departmentShareAmountPesewas;

  if (original.facultyId && facultyDelta !== 0) {
    const description = `Adjustment of payment ${original.paymentId} (${input.reason.trim()})`;
    if (facultyDelta > 0) {
      await creditWallet(
        "FACULTY",
        original.organizationId,
        original.facultyId,
        facultyDelta,
        "CORRECTION",
        correction._id,
        description,
      );
    } else {
      await debitWallet(
        "FACULTY",
        original.organizationId,
        original.facultyId,
        -facultyDelta,
        "CORRECTION",
        correction._id,
        description,
      );
    }
  }

  if (original.departmentId && departmentDelta !== 0) {
    const description = `Adjustment of payment ${original.paymentId} (${input.reason.trim()})`;
    if (departmentDelta > 0) {
      await creditWallet(
        "DEPARTMENT",
        original.organizationId,
        original.departmentId,
        departmentDelta,
        "CORRECTION",
        correction._id,
        description,
      );
    } else {
      await debitWallet(
        "DEPARTMENT",
        original.organizationId,
        original.departmentId,
        -departmentDelta,
        "CORRECTION",
        correction._id,
        description,
      );
    }
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "ledger.adjusted",
    targetType: "RevenueAllocation",
    targetId: correction._id.toString(),
    metadata: {
      adjustsEntryId: original._id.toString(),
      reason: input.reason.trim(),
      facultyDelta,
      departmentDelta,
    },
  });
}


export interface RevenueDeductionInput {
  name: string;
  paymentPeriodId?: string;
  facultyId?: string;
  departmentId?: string;
  academicLevelId?: string;
  studentCategoryId?: string;
  deductionType: DeductionType;
  amountPesewas?: number;
  percentageBps?: number;
}

export interface RevenueDeductionSummary {
  deductionId: string;
  name: string;
  paymentPeriodId: string | null;
  facultyId: string | null;
  departmentId: string | null;
  academicLevelId: string | null;
  studentCategoryId: string | null;
  deductionType: DeductionType;
  amountPesewas: number | null;
  percentageBps: number | null;
  status: RevenueDeductionStatus;
  isActive: boolean;
  createdAt: Date;
}

function toDeductionSummary(deduction: {
  _id: { toString(): string };
  name: string;
  paymentPeriodId?: { toString(): string } | null;
  facultyId?: { toString(): string } | null;
  departmentId?: { toString(): string } | null;
  academicLevelId?: { toString(): string } | null;
  studentCategoryId?: { toString(): string } | null;
  deductionType: DeductionType;
  amountPesewas?: number;
  percentageBps?: number;
  status: RevenueDeductionStatus;
  isActive: boolean;
  createdAt: Date;
}): RevenueDeductionSummary {
  return {
    deductionId: deduction._id.toString(),
    name: deduction.name,
    paymentPeriodId: deduction.paymentPeriodId?.toString() ?? null,
    facultyId: deduction.facultyId?.toString() ?? null,
    departmentId: deduction.departmentId?.toString() ?? null,
    academicLevelId: deduction.academicLevelId?.toString() ?? null,
    studentCategoryId: deduction.studentCategoryId?.toString() ?? null,
    deductionType: deduction.deductionType,
    amountPesewas: deduction.amountPesewas ?? null,
    percentageBps: deduction.percentageBps ?? null,
    status: deduction.status,
    isActive: deduction.isActive,
    createdAt: deduction.createdAt,
  };
}


export async function assertFixedAmountFitsExistingDuesConfigurations(
  organizationId: string,
  scope: RevenueScope,
  fixedAmountPesewas: number,
  errorPrefix: string,
): Promise<void> {
  const query: Record<string, unknown> = { organizationId, status: "ACTIVE" };
  if (scope.paymentPeriodId) query.paymentPeriodId = scope.paymentPeriodId;
  if (scope.facultyId) query.facultyId = scope.facultyId;
  if (scope.departmentId) query.departmentId = scope.departmentId;
  if (scope.academicLevelId) query.academicLevelId = scope.academicLevelId;
  if (scope.studentCategoryId) query.studentCategoryId = scope.studentCategoryId;

  const tooSmall = await DuesConfiguration.findOne({
    ...query,
    amountPesewas: { $lt: fixedAmountPesewas },
  });
  if (tooSmall) {
    throw new RevenueAllocationError(
      `${errorPrefix} (${fixedAmountPesewas} pesewas) exceeds the "${tooSmall.name}" dues configuration's amount (${tooSmall.amountPesewas} pesewas) for this scope.`,
    );
  }
}

export async function createRevenueDeduction(
  actor: SessionUser,
  organizationId: string,
  input: RevenueDeductionInput,
): Promise<void> {
  assertCan(actor, "revenue:configure", { organizationId });
  await connectToDatabase();

  if (input.deductionType === "FIXED" && input.amountPesewas) {
    await assertFixedAmountFitsExistingDuesConfigurations(
      organizationId,
      input,
      input.amountPesewas,
      "This deduction's fixed amount",
    );
  }

  const deduction = await RevenueDeduction.create({
    organizationId,
    name: input.name.trim(),
    paymentPeriodId: input.paymentPeriodId || undefined,
    facultyId: input.facultyId || undefined,
    departmentId: input.departmentId || undefined,
    academicLevelId: input.academicLevelId || undefined,
    studentCategoryId: input.studentCategoryId || undefined,
    deductionType: input.deductionType,
    amountPesewas: input.deductionType === "FIXED" ? input.amountPesewas : undefined,
    percentageBps: input.deductionType === "PERCENTAGE" ? input.percentageBps : undefined,
    status: "DRAFT",
    createdById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "revenue-deduction.created",
    targetType: "RevenueDeduction",
    targetId: deduction._id.toString(),
  });
}

export async function updateRevenueDeduction(
  actor: SessionUser,
  organizationId: string,
  deductionId: string,
  input: RevenueDeductionInput,
): Promise<void> {
  assertCan(actor, "revenue:configure", { organizationId });
  await connectToDatabase();

  const current = await RevenueDeduction.findOne({ _id: deductionId, organizationId });
  if (!current) {
    throw new RevenueAllocationError("Deduction not found.");
  }
  if (current.status === "ARCHIVED") {
    throw new RevenueAllocationError("An archived deduction cannot be edited.");
  }

  if (input.deductionType === "FIXED" && input.amountPesewas) {
    await assertFixedAmountFitsExistingDuesConfigurations(
      organizationId,
      input,
      input.amountPesewas,
      "This deduction's fixed amount",
    );
  }

  await RevenueDeduction.findByIdAndUpdate(deductionId, {
    name: input.name.trim(),
    paymentPeriodId: input.paymentPeriodId || undefined,
    facultyId: input.facultyId || undefined,
    departmentId: input.departmentId || undefined,
    academicLevelId: input.academicLevelId || undefined,
    studentCategoryId: input.studentCategoryId || undefined,
    deductionType: input.deductionType,
    amountPesewas: input.deductionType === "FIXED" ? input.amountPesewas : undefined,
    percentageBps: input.deductionType === "PERCENTAGE" ? input.percentageBps : undefined,
    updatedById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "revenue-deduction.updated",
    targetType: "RevenueDeduction",
    targetId: deductionId,
  });
}

export async function listRevenueDeductions(
  actor: SessionUser,
  organizationId: string,
): Promise<RevenueDeductionSummary[]> {
  assertCan(actor, "revenue:configure", { organizationId });
  await connectToDatabase();

  const deductions = await RevenueDeduction.find({ organizationId }).sort({ createdAt: -1 });
  return deductions.map(toDeductionSummary);
}

const DEDUCTION_TRANSITIONS: Record<RevenueDeductionStatus, RevenueDeductionStatus[]> = {
  DRAFT: ["APPROVED", "ARCHIVED"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
};

export async function transitionRevenueDeductionStatus(
  actor: SessionUser,
  organizationId: string,
  deductionId: string,
  nextStatus: RevenueDeductionStatus,
): Promise<void> {
  assertCan(actor, "revenue:configure", { organizationId });
  await connectToDatabase();

  const deduction = await RevenueDeduction.findOne({ _id: deductionId, organizationId });
  if (!deduction) {
    throw new RevenueAllocationError("Deduction not found.");
  }

  const current = deduction.status as RevenueDeductionStatus;
  if (!DEDUCTION_TRANSITIONS[current].includes(nextStatus)) {
    throw new RevenueAllocationError(`Cannot move a ${current} deduction to ${nextStatus}.`);
  }

  if (nextStatus === "APPROVED" && deduction.deductionType === "FIXED" && deduction.amountPesewas) {
    await assertFixedAmountFitsExistingDuesConfigurations(
      organizationId,
      deduction,
      deduction.amountPesewas,
      "This deduction's fixed amount",
    );
  }

  await RevenueDeduction.updateOne(
    { _id: deductionId },
    { status: nextStatus, updatedById: actor.userId },
  );

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "revenue-deduction.status_changed",
    targetType: "RevenueDeduction",
    targetId: deductionId,
    metadata: { from: current, to: nextStatus },
  });
}

export interface LedgerFilters {
  search?: string;
  status?: RevenueAllocationStatus;
  facultyId?: string;
  departmentId?: string;
  studentCategoryId?: string;
  academicLevelId?: string;
  paymentPeriodId?: string;
}

export interface LedgerPagination {
  page: number;
  pageSize: number;
}

export interface LedgerEntrySummary {
  allocationId: string;
  paymentId: string;
  studentIndexNumber: string;
  facultyName: string | null;
  departmentName: string | null;
  studentCategoryName: string | null;
  academicLevelName: string | null;
  paymentPeriodName: string;
  totalAmountPesewas: number;
  facultyShareAmountPesewas: number;
  departmentShareAmountPesewas: number;
  deductionsTotalPesewas: number;
  ruleNameSnapshot: string;
  status: RevenueAllocationStatus;
  adjustsEntryId: string | null;
  adjustmentReason: string | null;
  createdAt: Date;
}

function buildLedgerQuery(organizationId: string, filters: LedgerFilters): Record<string, unknown> {
  const query: Record<string, unknown> = { organizationId };

  if (filters.status) query.status = filters.status;
  if (filters.paymentPeriodId) query.paymentPeriodId = filters.paymentPeriodId;
  if (filters.facultyId) query.facultyId = filters.facultyId;
  if (filters.departmentId) query.departmentId = filters.departmentId;
  if (filters.studentCategoryId) query.studentCategoryId = filters.studentCategoryId;
  if (filters.academicLevelId) query.academicLevelId = filters.academicLevelId;
  if (filters.search?.trim()) {
    query.studentIndexNumber = { $regex: escapeRegExp(filters.search.trim()), $options: "i" };
  }

  return query;
}

function toLedgerEntrySummary(entry: {
  _id: { toString(): string };
  paymentId: { toString(): string };
  studentIndexNumber: string;
  facultyName?: string;
  departmentName?: string;
  studentCategoryName?: string;
  academicLevelName?: string;
  paymentPeriodName: string;
  totalAmountPesewas: number;
  facultyShareAmountPesewas: number;
  departmentShareAmountPesewas: number;
  deductionsTotalPesewas: number;
  ruleNameSnapshot: string;
  status: RevenueAllocationStatus;
  adjustsEntryId?: { toString(): string };
  adjustmentReason?: string;
  createdAt: Date;
}): LedgerEntrySummary {
  return {
    allocationId: entry._id.toString(),
    paymentId: entry.paymentId.toString(),
    studentIndexNumber: entry.studentIndexNumber,
    facultyName: entry.facultyName ?? null,
    departmentName: entry.departmentName ?? null,
    studentCategoryName: entry.studentCategoryName ?? null,
    academicLevelName: entry.academicLevelName ?? null,
    paymentPeriodName: entry.paymentPeriodName,
    totalAmountPesewas: entry.totalAmountPesewas,
    facultyShareAmountPesewas: entry.facultyShareAmountPesewas,
    departmentShareAmountPesewas: entry.departmentShareAmountPesewas,
    deductionsTotalPesewas: entry.deductionsTotalPesewas,
    ruleNameSnapshot: entry.ruleNameSnapshot,
    status: entry.status,
    adjustsEntryId: entry.adjustsEntryId?.toString() ?? null,
    adjustmentReason: entry.adjustmentReason ?? null,
    createdAt: entry.createdAt,
  };
}

export async function listLedgerEntries(
  actor: SessionUser,
  organizationId: string,
  filters: LedgerFilters,
  pagination: LedgerPagination,
): Promise<{ entries: LedgerEntrySummary[]; totalCount: number }> {
  assertCan(actor, "payment:view", { organizationId });
  await connectToDatabase();

  const query = buildLedgerQuery(organizationId, filters);
  const skip = (pagination.page - 1) * pagination.pageSize;

  const [entries, totalCount] = await Promise.all([
    RevenueAllocation.find(query).sort({ createdAt: -1 }).skip(skip).limit(pagination.pageSize),
    RevenueAllocation.countDocuments(query),
  ]);

  return { totalCount, entries: entries.map(toLedgerEntrySummary) };
}
