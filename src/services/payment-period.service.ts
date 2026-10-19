import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { PaymentPeriod, type PaymentPeriodStatus } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { escapeRegExp } from "@/lib/db/escape-regex";
import type { SessionUser } from "@/lib/permissions/roles";

export class PaymentPeriodError extends Error {}

export type { PaymentPeriodStatus };

export interface PaymentPeriodSummary {
  paymentPeriodId: string;
  name: string;
  code: string;
  academicYear: string;
  startDate: Date;
  endDate: Date;
  paymentOpenDate: Date;
  paymentCloseDate: Date;
  status: PaymentPeriodStatus;
  description: string | null;
  createdAt: Date;
}

export interface PaymentPeriodInput {
  name: string;
  code: string;
  academicYear: string;
  startDate: Date;
  endDate: Date;
  paymentOpenDate: Date;
  paymentCloseDate: Date;
  description?: string;
}

async function assertUniquePaymentPeriodName(
  organizationId: string,
  name: string,
  excludePaymentPeriodId?: string,
): Promise<void> {
  const existing = await PaymentPeriod.findOne({
    organizationId,
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
    ...(excludePaymentPeriodId ? { _id: { $ne: excludePaymentPeriodId } } : {}),
  });
  if (existing) {
    throw new PaymentPeriodError("A payment period with this name already exists.");
  }
}

function assertValidDates(input: PaymentPeriodInput): void {
  if (input.endDate <= input.startDate) {
    throw new PaymentPeriodError("End date must be after the start date.");
  }
  if (input.paymentCloseDate <= input.paymentOpenDate) {
    throw new PaymentPeriodError("Payment closing date must be after the payment opening date.");
  }
}

function toSummary(period: {
  _id: { toString(): string };
  name: string;
  code: string;
  academicYear: string;
  startDate: Date;
  endDate: Date;
  paymentOpenDate: Date;
  paymentCloseDate: Date;
  status: PaymentPeriodStatus;
  description?: string;
  createdAt: Date;
}): PaymentPeriodSummary {
  return {
    paymentPeriodId: period._id.toString(),
    name: period.name,
    code: period.code,
    academicYear: period.academicYear,
    startDate: period.startDate,
    endDate: period.endDate,
    paymentOpenDate: period.paymentOpenDate,
    paymentCloseDate: period.paymentCloseDate,
    status: period.status,
    description: period.description ?? null,
    createdAt: period.createdAt,
  };
}

export async function createPaymentPeriod(
  actor: SessionUser,
  organizationId: string,
  input: PaymentPeriodInput,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  assertValidDates(input);

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniquePaymentPeriodName(organizationId, name);
  const existingCode = await PaymentPeriod.findOne({ organizationId, code });
  if (existingCode) {
    throw new PaymentPeriodError("A payment period with this code already exists.");
  }

  const period = await PaymentPeriod.create({
    organizationId,
    name,
    code,
    academicYear: input.academicYear.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    paymentOpenDate: input.paymentOpenDate,
    paymentCloseDate: input.paymentCloseDate,
    description: input.description?.trim() || undefined,
    status: "DRAFT",
    createdById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "payment-period.created",
    targetType: "PaymentPeriod",
    targetId: period._id.toString(),
  });
}

export async function updatePaymentPeriod(
  actor: SessionUser,
  organizationId: string,
  paymentPeriodId: string,
  input: PaymentPeriodInput,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const period = await PaymentPeriod.findOne({ _id: paymentPeriodId, organizationId });
  if (!period) {
    throw new PaymentPeriodError("Payment period not found.");
  }
  if (period.status === "ARCHIVED") {
    throw new PaymentPeriodError("An archived payment period cannot be edited.");
  }

  assertValidDates(input);

  const name = input.name.trim();
  const code = input.code.toUpperCase().trim();

  await assertUniquePaymentPeriodName(organizationId, name, paymentPeriodId);
  const existingCode = await PaymentPeriod.findOne({
    organizationId,
    code,
    _id: { $ne: paymentPeriodId },
  });
  if (existingCode) {
    throw new PaymentPeriodError("A payment period with this code already exists.");
  }

  await PaymentPeriod.findByIdAndUpdate(paymentPeriodId, {
    name,
    code,
    academicYear: input.academicYear.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    paymentOpenDate: input.paymentOpenDate,
    paymentCloseDate: input.paymentCloseDate,
    description: input.description?.trim() || undefined,
    updatedById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "payment-period.updated",
    targetType: "PaymentPeriod",
    targetId: paymentPeriodId,
  });
}

export async function listPaymentPeriods(
  actor: SessionUser,
  organizationId: string,
): Promise<PaymentPeriodSummary[]> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const periods = await PaymentPeriod.find({ organizationId }).sort({ startDate: -1 });
  return periods.map(toSummary);
}

export async function getPaymentPeriodDetails(
  actor: SessionUser,
  organizationId: string,
  paymentPeriodId: string,
): Promise<PaymentPeriodSummary> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const period = await PaymentPeriod.findOne({ _id: paymentPeriodId, organizationId });
  if (!period) {
    throw new PaymentPeriodError("Payment period not found.");
  }
  return toSummary(period);
}

export const PAYMENT_PERIOD_TRANSITIONS: Record<PaymentPeriodStatus, PaymentPeriodStatus[]> = {
  DRAFT: ["SCHEDULED", "ARCHIVED"],
  SCHEDULED: ["DRAFT", "ACTIVE", "ARCHIVED"],
  ACTIVE: ["CLOSED"],
  CLOSED: ["ARCHIVED"],
  ARCHIVED: [],
};

export const PAYMENT_PERIOD_STATUS_LABELS: Record<PaymentPeriodStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export async function transitionPaymentPeriodStatus(
  actor: SessionUser,
  organizationId: string,
  paymentPeriodId: string,
  nextStatus: PaymentPeriodStatus,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const period = await PaymentPeriod.findOne({ _id: paymentPeriodId, organizationId });
  if (!period) {
    throw new PaymentPeriodError("Payment period not found.");
  }

  const currentStatus = period.status as PaymentPeriodStatus;
  if (!PAYMENT_PERIOD_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new PaymentPeriodError(
      `Cannot move a ${PAYMENT_PERIOD_STATUS_LABELS[currentStatus]} period to ${PAYMENT_PERIOD_STATUS_LABELS[nextStatus]}.`,
    );
  }

  if (nextStatus === "ACTIVE") {
    const activeElsewhere = await PaymentPeriod.findOne({
      organizationId,
      status: "ACTIVE",
      _id: { $ne: paymentPeriodId },
    });
    if (activeElsewhere) {
      throw new PaymentPeriodError(
        `Close "${activeElsewhere.name}" before activating another period.`,
      );
    }
  }

  await PaymentPeriod.findByIdAndUpdate(paymentPeriodId, {
    status: nextStatus,
    updatedById: actor.userId,
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "payment-period.status_changed",
    targetType: "PaymentPeriod",
    targetId: paymentPeriodId,
    metadata: { from: currentStatus, to: nextStatus },
  });
}
