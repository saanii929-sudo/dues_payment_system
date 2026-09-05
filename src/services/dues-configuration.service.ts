import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { DuesConfiguration, PaymentPeriod } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { setEntityActive } from "@/lib/db/scoped-activation";
import type { SessionUser } from "@/lib/permissions/roles";
import type { PesewasAmount } from "@/models";

export class DuesConfigurationError extends Error {}

export interface DuesConfigurationSummary {
  duesConfigurationId: string;
  name: string;
  code: string;
  amountPesewas: PesewasAmount;
  paymentPeriodName: string;
  facultyName: string | null;
  departmentName: string | null;
  academicLevelName: string | null;
  studentCategoryName: string | null;
  isMandatory: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateDuesConfigurationInput {
  name: string;
  code: string;
  paymentPeriodId: string;
  amountPesewas: PesewasAmount;
  facultyId?: string;
  departmentId?: string;
  academicLevelId?: string;
  studentCategoryId?: string;
  isMandatory: boolean;
}

export async function createDuesConfiguration(
  actor: SessionUser,
  organizationId: string,
  input: CreateDuesConfigurationInput,
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

  const code = input.code.toUpperCase().trim();
  const existing = await DuesConfiguration.findOne({
    organizationId,
    paymentPeriodId: input.paymentPeriodId,
    code,
  });
  if (existing) {
    throw new DuesConfigurationError(
      "A dues configuration with this code already exists in this payment period.",
    );
  }

  const duesConfiguration = await DuesConfiguration.create({
    organizationId,
    paymentPeriodId: input.paymentPeriodId,
    name: input.name.trim(),
    code,
    amountPesewas: input.amountPesewas,
    facultyId: input.facultyId || undefined,
    departmentId: input.departmentId || undefined,
    academicLevelId: input.academicLevelId || undefined,
    studentCategoryId: input.studentCategoryId || undefined,
    isMandatory: input.isMandatory,
    createdById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "dues-configuration.created",
    targetType: "DuesConfiguration",
    targetId: duesConfiguration._id.toString(),
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
      paymentPeriodId: { name: string };
      facultyId?: { name: string } | null;
      departmentId?: { name: string } | null;
      academicLevelId?: { name: string } | null;
      studentCategoryId?: { name: string } | null;
    }>(["paymentPeriodId", "facultyId", "departmentId", "academicLevelId", "studentCategoryId"])
    .sort({ createdAt: -1 });

  return configurations
    .filter((configuration) => Boolean(configuration.paymentPeriodId))
    .map((configuration) => ({
      duesConfigurationId: configuration._id.toString(),
      name: configuration.name,
      code: configuration.code,
      amountPesewas: configuration.amountPesewas,
      paymentPeriodName: configuration.paymentPeriodId.name,
      facultyName: configuration.facultyId?.name ?? null,
      departmentName: configuration.departmentId?.name ?? null,
      academicLevelName: configuration.academicLevelId?.name ?? null,
      studentCategoryName: configuration.studentCategoryId?.name ?? null,
      isMandatory: configuration.isMandatory,
      isActive: configuration.isActive,
      createdAt: configuration.createdAt,
    }));
}

async function setDuesConfigurationActive(
  actor: SessionUser,
  organizationId: string,
  duesConfigurationId: string,
  isActive: boolean,
): Promise<void> {
  assertCan(actor, "dues:configure", { organizationId });
  await connectToDatabase();

  const updated = await setEntityActive(
    DuesConfiguration,
    duesConfigurationId,
    isActive,
    actor.userId,
  );
  if (!updated) {
    throw new DuesConfigurationError("Dues configuration not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "dues-configuration.reactivated" : "dues-configuration.deactivated",
    targetType: "DuesConfiguration",
    targetId: duesConfigurationId,
  });
}

export async function deactivateDuesConfiguration(
  actor: SessionUser,
  organizationId: string,
  duesConfigurationId: string,
): Promise<void> {
  await setDuesConfigurationActive(actor, organizationId, duesConfigurationId, false);
}

export async function reactivateDuesConfiguration(
  actor: SessionUser,
  organizationId: string,
  duesConfigurationId: string,
): Promise<void> {
  await setDuesConfigurationActive(actor, organizationId, duesConfigurationId, true);
}
