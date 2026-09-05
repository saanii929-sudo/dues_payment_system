import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { PaymentPeriod } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { setEntityActive } from "@/lib/db/scoped-activation";
import type { SessionUser } from "@/lib/permissions/roles";

export class PaymentPeriodError extends Error {}

export interface PaymentPeriodSummary {
  paymentPeriodId: string;
  name: string;
  code: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface CreatePaymentPeriodInput {
  name: string;
  code: string;
  startDate: Date;
  endDate: Date;
}

export async function createPaymentPeriod(
  actor: SessionUser,
  organizationId: string,
  input: CreatePaymentPeriodInput,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  if (input.endDate <= input.startDate) {
    throw new PaymentPeriodError("End date must be after the start date.");
  }

  const code = input.code.toUpperCase().trim();
  const existing = await PaymentPeriod.findOne({ organizationId, code });
  if (existing) {
    throw new PaymentPeriodError("A payment period with this code already exists.");
  }

  const period = await PaymentPeriod.create({
    organizationId,
    name: input.name.trim(),
    code,
    startDate: input.startDate,
    endDate: input.endDate,
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

export async function listPaymentPeriods(
  actor: SessionUser,
  organizationId: string,
): Promise<PaymentPeriodSummary[]> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const periods = await PaymentPeriod.find({ organizationId }).sort({ startDate: -1 });
  return periods.map((period) => ({
    paymentPeriodId: period._id.toString(),
    name: period.name,
    code: period.code,
    startDate: period.startDate,
    endDate: period.endDate,
    isCurrent: period.isCurrent,
    isActive: period.isActive,
    createdAt: period.createdAt,
  }));
}

export async function setCurrentPaymentPeriod(
  actor: SessionUser,
  organizationId: string,
  paymentPeriodId: string,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const period = await PaymentPeriod.findOne({ _id: paymentPeriodId, organizationId });
  if (!period) {
    throw new PaymentPeriodError("Payment period not found.");
  }

  await PaymentPeriod.updateMany(
    { organizationId, isCurrent: true, _id: { $ne: paymentPeriodId } },
    { isCurrent: false },
  );
  await PaymentPeriod.findByIdAndUpdate(paymentPeriodId, { isCurrent: true });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "payment-period.set_current",
    targetType: "PaymentPeriod",
    targetId: paymentPeriodId,
  });
}

async function setPaymentPeriodActive(
  actor: SessionUser,
  organizationId: string,
  paymentPeriodId: string,
  isActive: boolean,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const updated = await setEntityActive(PaymentPeriod, paymentPeriodId, isActive, actor.userId);
  if (!updated) {
    throw new PaymentPeriodError("Payment period not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "payment-period.reactivated" : "payment-period.deactivated",
    targetType: "PaymentPeriod",
    targetId: paymentPeriodId,
  });
}

export async function deactivatePaymentPeriod(
  actor: SessionUser,
  organizationId: string,
  paymentPeriodId: string,
): Promise<void> {
  await setPaymentPeriodActive(actor, organizationId, paymentPeriodId, false);
}

export async function reactivatePaymentPeriod(
  actor: SessionUser,
  organizationId: string,
  paymentPeriodId: string,
): Promise<void> {
  await setPaymentPeriodActive(actor, organizationId, paymentPeriodId, true);
}
