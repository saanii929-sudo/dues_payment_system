import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { Payment, Refund } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { getPlatformSettings } from "./platform.service";
import { getPaymentProvider } from "@/lib/payments";
import { reverseRevenueAllocationsForPayment } from "./revenue-allocation.service";
import type { SessionUser } from "@/lib/permissions/roles";

export class RefundError extends Error {}

export interface RefundSummary {
  refundId: string;
  paymentId: string;
  amountPesewas: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "PROCESSED" | "REJECTED";
  processedReference: string | null;
  processedAt: Date | null;
}


export async function processRefund(
  actor: SessionUser,
  organizationId: string,
  paymentId: string,
  reason: string,
): Promise<RefundSummary> {
  assertCan(actor, "payment:refund", { organizationId });
  await connectToDatabase();

  const payment = await Payment.findOne({ _id: paymentId, organizationId });
  if (!payment) {
    throw new RefundError("Payment not found.");
  }
  if (payment.status !== "SUCCESSFUL") {
    throw new RefundError(
      `Only a Successful payment can be refunded — this payment is ${payment.status}.`,
    );
  }
  if (!payment.providerReference) {
    throw new RefundError("This payment has no gateway transaction reference to refund.");
  }

  const refund = await Refund.create({
    organizationId,
    paymentId: payment._id,
    requestedById: actor.userId,
    amountPesewas: payment.amountPesewas,
    reason,
    status: "PENDING",
  });

  const settings = await getPlatformSettings();
  const provider = getPaymentProvider(settings.paymentEnvironment);

  const result = await provider.refundPayment({
    providerReference: payment.providerReference,
    amountPesewas: payment.amountPesewas,
    reason,
  });

  if (result.status !== "success") {
    refund.status = "REJECTED";
    await refund.save();

    await recordAudit({
      organizationId,
      actorId: actor.userId,
      actorRoleSnapshot: actor.role,
      action: "refund.rejected",
      targetType: "Refund",
      targetId: refund._id.toString(),
    });

    return toSummary(refund);
  }

  refund.status = "PROCESSED";
  refund.processedReference = result.refundReference;
  refund.processedAt = new Date();
  await refund.save();

  // Only re-flip if still SUCCESSFUL — the idempotency guard for this whole function.
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "SUCCESSFUL" },
    { $set: { status: "REFUNDED" } },
    { new: true },
  );
  if (updated) {
    await reverseRevenueAllocationsForPayment(payment._id, refund._id);
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "refund.processed",
    targetType: "Refund",
    targetId: refund._id.toString(),
    metadata: { paymentId: payment._id.toString() },
  });

  return toSummary(refund);
}

function toSummary(refund: {
  _id: { toString(): string };
  paymentId: { toString(): string };
  amountPesewas: number;
  reason: string;
  status: RefundSummary["status"];
  processedReference?: string;
  processedAt?: Date;
}): RefundSummary {
  return {
    refundId: refund._id.toString(),
    paymentId: refund.paymentId.toString(),
    amountPesewas: refund.amountPesewas,
    reason: refund.reason,
    status: refund.status,
    processedReference: refund.processedReference ?? null,
    processedAt: refund.processedAt ?? null,
  };
}
