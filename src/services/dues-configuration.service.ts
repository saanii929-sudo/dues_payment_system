import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { DuesConfiguration, Department, PaymentPeriod } from "@/models";
import type { DuesConfigurationStatus } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import type { SessionUser } from "@/lib/permissions/roles";
import type { PesewasAmount } from "@/models";

export class DuesConfigurationError extends Error {}

export type { DuesConfigurationStatus };

export interface DuesConfigurationSummary {
  duesConfigurationId: string;
  name: string;
  code: string;
  amountPesewas: PesewasAmount;
  effectiveDate: Date;
  status: DuesConfigurationStatus;
  paymentPeriodId: string;
  paymentPeriodName: string;
  facultyId: string | null;
  facultyName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  academicLevelId: string | null;
  academicLevelName: string | null;
  studentCategoryId: string | null;
  studentCategoryName: string | null;
  isMandatory: boolean;
  createdByName: string | null;
  createdAt: Date;
}

export interface DuesConfigurationInput {
  name: string;
  code: string;
  paymentPeriodId: string;
  amountPesewas: PesewasAmount;
  effectiveDate: Date;
  facultyId?: string;
  departmentId?: string;
  academicLevelId?: string;
  studentCategoryId?: string;
  isMandatory: boolean;
}

interface ScopeKey {
  paymentPeriodId: string;
  facultyId: string | null;
  departmentId: string | null;
  academicLevelId: string | null;
  studentCategoryId: string | null;
}

async function resolveFacultyId(
  organizationId: string,
  input: Pick<DuesConfigurationInput, "facultyId" | "departmentId">,
): Promise<string | undefined> {
  if (!input.departmentId) {
    return input.facultyId || undefined;
  }

  const department = await Department.findOne({
    _id: input.departmentId,
    organizationId,
  });
  if (!department) {
    throw new DuesConfigurationError("Department not found in this organization.");
  }

  const departmentFacultyId = department.facultyId.toString();
  if (input.facultyId && input.facultyId !== departmentFacultyId) {
    throw new DuesConfigurationError("The selected department does not belong to the selected faculty.");
  }

  return departmentFacultyId;
}

function toScopeKey(config: {
  paymentPeriodId: { toString(): string };
  facultyId?: { toString(): string } | null;
  departmentId?: { toString(): string } | null;
  academicLevelId?: { toString(): string } | null;
  studentCategoryId?: { toString(): string } | null;
}): ScopeKey {
  return {
    paymentPeriodId: config.paymentPeriodId.toString(),
    facultyId: config.facultyId ? config.facultyId.toString() : null,
    departmentId: config.departmentId ? config.departmentId.toString() : null,
    academicLevelId: config.academicLevelId ? config.academicLevelId.toString() : null,
    studentCategoryId: config.studentCategoryId ? config.studentCategoryId.toString() : null,
  };
}

async function assertNoActiveOverlap(
  organizationId: string,
  scopeKey: ScopeKey,
  excludeId?: string,
): Promise<void> {
  const existing = await DuesConfiguration.findOne({
    organizationId,
    status: "ACTIVE",
    paymentPeriodId: scopeKey.paymentPeriodId,
    facultyId: scopeKey.facultyId,
    departmentId: scopeKey.departmentId,
    academicLevelId: scopeKey.academicLevelId,
    studentCategoryId: scopeKey.studentCategoryId,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (existing) {
    throw new DuesConfigurationError(
      `"${existing.name}" already covers this exact scope and is Active. Archive it before activating another.`,
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSummary(configuration: any): DuesConfigurationSummary {
  return {
    duesConfigurationId: configuration._id.toString(),
    name: configuration.name,
    code: configuration.code,
    amountPesewas: configuration.amountPesewas,
    effectiveDate: configuration.effectiveDate,
    status: configuration.status,
    paymentPeriodId: configuration.paymentPeriodId._id.toString(),
    paymentPeriodName: configuration.paymentPeriodId.name,
    facultyId: configuration.facultyId?._id.toString() ?? null,
    facultyName: configuration.facultyId?.name ?? null,
    departmentId: configuration.departmentId?._id.toString() ?? null,
    departmentName: configuration.departmentId?.name ?? null,
    academicLevelId: configuration.academicLevelId?._id.toString() ?? null,
    academicLevelName: configuration.academicLevelId?.name ?? null,
    studentCategoryId: configuration.studentCategoryId?._id.toString() ?? null,
    studentCategoryName: configuration.studentCategoryId?.name ?? null,
    isMandatory: configuration.isMandatory,
    createdByName: configuration.createdById?.fullName ?? null,
    createdAt: configuration.createdAt,
  };
}

export async function createDuesConfiguration(
  actor: SessionUser,
  organizationId: string,
  input: DuesConfigurationInput,
  options: { publish: boolean },
): Promise<void> {
  assertCan(actor, "dues:configure", { organizationId });
  await connectToDatabase();

  const paymentPeriod = await PaymentPeriod.findOne({
    _id: input.paymentPeriodId,
    organizationId,
  });
  if (!paymentPeriod) {
    throw new DuesConfigurationError("Payment period not found in this organization.");
  }

  const facultyId = await resolveFacultyId(organizationId, input);

  const code = input.code.toUpperCase().trim();
  const existingCode = await DuesConfiguration.findOne({
    organizationId,
    paymentPeriodId: input.paymentPeriodId,
    code,
  });
  if (existingCode) {
    throw new DuesConfigurationError(
      "A dues configuration with this code already exists in this payment period.",
    );
  }

  const status: DuesConfigurationStatus = options.publish ? "ACTIVE" : "DRAFT";
  if (status === "ACTIVE") {
    await assertNoActiveOverlap(organizationId, {
      paymentPeriodId: input.paymentPeriodId,
      facultyId: facultyId ?? null,
      departmentId: input.departmentId ?? null,
      academicLevelId: input.academicLevelId ?? null,
      studentCategoryId: input.studentCategoryId ?? null,
    });
  }

  const duesConfiguration = await DuesConfiguration.create({
    organizationId,
    paymentPeriodId: input.paymentPeriodId,
    name: input.name.trim(),
    code,
    amountPesewas: input.amountPesewas,
    effectiveDate: input.effectiveDate,
    facultyId: facultyId || undefined,
    departmentId: input.departmentId || undefined,
    academicLevelId: input.academicLevelId || undefined,
    studentCategoryId: input.studentCategoryId || undefined,
    isMandatory: input.isMandatory,
    status,
    createdById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "dues-configuration.created",
    targetType: "DuesConfiguration",
    targetId: duesConfiguration._id.toString(),
    metadata: { status },
  });
}

export async function updateDuesConfiguration(
  actor: SessionUser,
  organizationId: string,
  duesConfigurationId: string,
  input: DuesConfigurationInput,
): Promise<void> {
  assertCan(actor, "dues:configure", { organizationId });
  await connectToDatabase();

  const current = await DuesConfiguration.findOne({
    _id: duesConfigurationId,
    organizationId,
  });
  if (!current) {
    throw new DuesConfigurationError("Dues configuration not found.");
  }
  if (current.status === "ARCHIVED") {
    throw new DuesConfigurationError("An archived dues configuration cannot be edited.");
  }

  const paymentPeriod = await PaymentPeriod.findOne({
    _id: input.paymentPeriodId,
    organizationId,
  });
  if (!paymentPeriod) {
    throw new DuesConfigurationError("Payment period not found in this organization.");
  }

  const facultyId = await resolveFacultyId(organizationId, input);

  const code = input.code.toUpperCase().trim();
  const existingCode = await DuesConfiguration.findOne({
    organizationId,
    paymentPeriodId: input.paymentPeriodId,
    code,
    _id: { $ne: duesConfigurationId },
  });
  if (existingCode) {
    throw new DuesConfigurationError(
      "A dues configuration with this code already exists in this payment period.",
    );
  }

  if (current.status === "ACTIVE") {
    await assertNoActiveOverlap(
      organizationId,
      {
        paymentPeriodId: input.paymentPeriodId,
        facultyId: facultyId ?? null,
        departmentId: input.departmentId ?? null,
        academicLevelId: input.academicLevelId ?? null,
        studentCategoryId: input.studentCategoryId ?? null,
      },
      duesConfigurationId,
    );
  }

  await DuesConfiguration.findByIdAndUpdate(duesConfigurationId, {
    name: input.name.trim(),
    code,
    paymentPeriodId: input.paymentPeriodId,
    amountPesewas: input.amountPesewas,
    effectiveDate: input.effectiveDate,
    facultyId: facultyId || undefined,
    departmentId: input.departmentId || undefined,
    academicLevelId: input.academicLevelId || undefined,
    studentCategoryId: input.studentCategoryId || undefined,
    isMandatory: input.isMandatory,
    updatedById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "dues-configuration.updated",
    targetType: "DuesConfiguration",
    targetId: duesConfigurationId,
  });
}

export async function listDuesConfigurations(
  actor: SessionUser,
  organizationId: string,
): Promise<DuesConfigurationSummary[]> {
  assertCan(actor, "dues:configure", { organizationId });
  await connectToDatabase();

  const configurations = await DuesConfiguration.find({ organizationId })
    .populate<{
      paymentPeriodId: { _id: { toString(): string }; name: string };
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

  return configurations
    .filter((configuration) => Boolean(configuration.paymentPeriodId))
    .map(toSummary);
}

const ALLOWED_TRANSITIONS: Record<DuesConfigurationStatus, DuesConfigurationStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["ARCHIVED"],
  ARCHIVED: [],
};

const STATUS_LABELS: Record<DuesConfigurationStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export async function transitionDuesConfigurationStatus(
  actor: SessionUser,
  organizationId: string,
  duesConfigurationId: string,
  nextStatus: DuesConfigurationStatus,
): Promise<void> {
  assertCan(actor, "dues:configure", { organizationId });
  await connectToDatabase();

  const configuration = await DuesConfiguration.findOne({
    _id: duesConfigurationId,
    organizationId,
  });
  if (!configuration) {
    throw new DuesConfigurationError("Dues configuration not found.");
  }

  const currentStatus = configuration.status as DuesConfigurationStatus;
  if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new DuesConfigurationError(
      `Cannot move a ${STATUS_LABELS[currentStatus]} configuration to ${STATUS_LABELS[nextStatus]}.`,
    );
  }

  if (nextStatus === "ACTIVE") {
    await assertNoActiveOverlap(
      organizationId,
      toScopeKey(configuration),
      duesConfigurationId,
    );
  }

  await DuesConfiguration.findByIdAndUpdate(duesConfigurationId, {
    status: nextStatus,
    updatedById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "dues-configuration.status_changed",
    targetType: "DuesConfiguration",
    targetId: duesConfigurationId,
    metadata: { from: currentStatus, to: nextStatus },
  });
}

export interface ResolveDuesConfigurationInput {
  paymentPeriodId: string;
  facultyId?: string | null;
  departmentId?: string | null;
  academicLevelId?: string | null;
  studentCategoryId?: string | null;
}

export async function resolveApplicableDuesConfiguration(
  organizationId: string,
  input: ResolveDuesConfigurationInput,
): Promise<DuesConfigurationSummary | null> {
  await connectToDatabase();

  const candidates = await DuesConfiguration.find({
    organizationId,
    paymentPeriodId: input.paymentPeriodId,
    status: "ACTIVE",
    effectiveDate: { $lte: new Date() },
    facultyId: { $in: [null, input.facultyId ?? null] },
    departmentId: { $in: [null, input.departmentId ?? null] },
    academicLevelId: { $in: [null, input.academicLevelId ?? null] },
    studentCategoryId: { $in: [null, input.studentCategoryId ?? null] },
  })
    .populate<{
      paymentPeriodId: { _id: { toString(): string }; name: string };
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
    .sort({ effectiveDate: -1, createdAt: -1 });

  if (candidates.length === 0) {
    return null;
  }

  function specificity(config: (typeof candidates)[number]): number {
    return [
      config.facultyId,
      config.departmentId,
      config.academicLevelId,
      config.studentCategoryId,
    ].filter(Boolean).length;
  }

  const best = candidates.reduce((top, candidate) =>
    specificity(candidate) > specificity(top) ? candidate : top,
  );

  return toSummary(best);
}
