import "@/lib/serverOnly";
import { randomBytes, randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import {
  Payment,
  PaymentStatusHistory,
  PaymentPeriod,
  Organization,
  Faculty,
  Department,
  AcademicLevel,
  StudentCategory,
  RevenueAllocation,
  Refund,
} from "@/models";
import type { PaymentStatus } from "@/models";
import { getPublicOrganizationBySlug } from "./organization.service";
import { resolveApplicableDuesConfiguration } from "./dues-configuration.service";
import { getPlatformSettings } from "./platform.service";
import { allocateRevenueForPayment } from "./revenue-allocation.service";
import type { VolumeTrendPoint } from "./dashboard.service";
import { getPaymentProvider } from "@/lib/payments";
import type { PaymentProvider, VerifyPaymentResult } from "@/lib/payments/provider";
import { assertCan } from "@/lib/permissions/can";
import type { SessionUser } from "@/lib/permissions/roles";
import { recordAudit } from "@/lib/audit/recordAudit";
import { notificationProvider } from "@/lib/notifications/console";
import { formatPesewas } from "@/lib/format/currency";
import { escapeRegExp } from "@/lib/db/escape-regex";

export class PaymentError extends Error {}

export interface InitiatePaymentFormInput {
  indexNumber: string;
  fullName: string;
  facultyId?: string;
  departmentId?: string;
  academicLevelId: string;
  studentCategoryId: string;
  phone?: string;
  email?: string;
}

export interface PaymentUrls {
  appBaseUrl: string;
}

export interface PaymentSummary {
  clientReference: string;
  status: PaymentStatus;
  amountPesewas: number;
  currency: string;
  studentFullName: string;
  studentIndexNumber: string;
  facultyName: string | null;
  departmentName: string | null;
  academicLevelName: string | null;
  studentCategoryName: string | null;
  duesConfigurationName: string;
  providerReference: string | null;
  receiptNumber: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

function toSummary(payment: {
  clientReference: string;
  status: PaymentStatus;
  amountPesewas: number;
  currency: string;
  studentSnapshot: {
    fullName: string;
    facultyName?: string;
    departmentName?: string;
    academicLevelName?: string;
    studentCategoryName?: string;
  };
  studentIndexNumber: string;
  duesConfigurationSnapshot: { name: string };
  providerReference?: string;
  receiptNumber?: string;
  paidAt?: Date;
  createdAt: Date;
}): PaymentSummary {
  return {
    clientReference: payment.clientReference,
    status: payment.status,
    amountPesewas: payment.amountPesewas,
    currency: payment.currency,
    studentFullName: payment.studentSnapshot.fullName,
    studentIndexNumber: payment.studentIndexNumber,
    facultyName: payment.studentSnapshot.facultyName ?? null,
    departmentName: payment.studentSnapshot.departmentName ?? null,
    academicLevelName: payment.studentSnapshot.academicLevelName ?? null,
    studentCategoryName: payment.studentSnapshot.studentCategoryName ?? null,
    duesConfigurationName: payment.duesConfigurationSnapshot.name,
    providerReference: payment.providerReference ?? null,
    receiptNumber: payment.receiptNumber ?? null,
    paidAt: payment.paidAt ?? null,
    createdAt: payment.createdAt,
  };
}

function generateClientReference(): string {
  return `PAY-${randomUUID()}`;
}

function generateReceiptNumber(orgSlug: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = randomBytes(4).toString("hex").toUpperCase();
  const slugPrefix = orgSlug.slice(0, 6).toUpperCase();
  return `RCT-${slugPrefix}-${datePart}-${randomPart}`;
}


export async function initiatePayment(
  organizationSlug: string,
  input: InitiatePaymentFormInput,
  urls: PaymentUrls,
): Promise<{ clientReference: string; checkoutUrl: string | null }> {
  await connectToDatabase();

  const organization = await getPublicOrganizationBySlug(organizationSlug);
  if (!organization) {
    throw new PaymentError("This organization is not accepting payments right now.");
  }

  const activePeriod = await PaymentPeriod.findOne({
    organizationId: organization.organizationId,
    status: "ACTIVE",
  });
  if (!activePeriod) {
    throw new PaymentError("There is no active payment period right now.");
  }

  const applicable = await resolveApplicableDuesConfiguration(organization.organizationId, {
    paymentPeriodId: activePeriod._id.toString(),
    facultyId: input.facultyId,
    departmentId: input.departmentId,
    academicLevelId: input.academicLevelId,
    studentCategoryId: input.studentCategoryId,
  });
  if (!applicable) {
    throw new PaymentError("No dues configuration applies to your profile for this period.");
  }

  const [faculty, department, academicLevel, studentCategory] = await Promise.all([
    input.facultyId
      ? Faculty.findOne({ _id: input.facultyId, organizationId: organization.organizationId })
      : null,
    input.departmentId
      ? Department.findOne({ _id: input.departmentId, organizationId: organization.organizationId })
      : null,
    AcademicLevel.findOne({
      _id: input.academicLevelId,
      organizationId: organization.organizationId,
    }),
    StudentCategory.findOne({
      _id: input.studentCategoryId,
      organizationId: organization.organizationId,
    }),
  ]);
  if (!academicLevel) {
    throw new PaymentError("Select a valid academic level.");
  }
  if (!studentCategory) {
    throw new PaymentError("Select a valid student category.");
  }

  const settings = await getPlatformSettings();
  const provider = getPaymentProvider(settings.paymentEnvironment);
  const clientReference = generateClientReference();

  const callbackUrl = `${urls.appBaseUrl}/api/webhooks/${provider.name.toLowerCase()}`;
  const returnUrl = `${urls.appBaseUrl}/pay/${organizationSlug}/status/${clientReference}`;

  const payment = await Payment.create({
    organizationId: organization.organizationId,
    paymentPeriodId: activePeriod._id,
    duesConfigurationId: applicable.duesConfigurationId,
    duesConfigurationSnapshot: {
      name: applicable.name,
      code: applicable.code,
      amountPesewas: applicable.amountPesewas,
      effectiveDate: applicable.effectiveDate,
    },
    studentIndexNumber: input.indexNumber.trim(),
    studentSnapshot: {
      fullName: input.fullName.trim(),
      facultyId: faculty?._id.toString(),
      facultyName: faculty?.name,
      departmentId: department?._id.toString(),
      departmentName: department?.name,
      academicLevelId: academicLevel._id.toString(),
      academicLevelName: academicLevel.name,
      studentCategoryId: studentCategory._id.toString(),
      studentCategoryName: studentCategory.name,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim().toLowerCase() || undefined,
    },
    amountPesewas: applicable.amountPesewas,
    currency: "GHS",
    provider: provider.name,
    clientReference,
    status: "PENDING",
  });

  const result = await provider.initializePayment({
    indexNumber: input.indexNumber.trim(),
    amountPesewas: applicable.amountPesewas,
    description: `${applicable.name} — ${organization.name}`,
    callbackUrl,
    returnUrl,
    clientReference,
  });

  payment.providerReference = result.providerReference;
  await payment.save();

  await recordAudit({
    organizationId: organization.organizationId,
    action: "payment.initiated",
    targetType: "Payment",
    targetId: payment._id.toString(),
  });

  return { clientReference, checkoutUrl: result.checkoutUrl };
}

export async function getPaymentByClientReference(
  clientReference: string,
): Promise<PaymentSummary | null> {
  await connectToDatabase();
  const payment = await Payment.findOne({ clientReference });
  return payment ? toSummary(payment) : null;
}

const PROVIDER_TO_PAYMENT_STATUS: Record<VerifyPaymentResult["status"], PaymentStatus> = {
  pending: "PENDING",
  success: "SUCCESSFUL",
  failed: "FAILED",
  cancelled: "CANCELLED",
};

export async function recordPaymentOutcome(
  provider: PaymentProvider,
  rawBody: string,
  headers: Headers,
): Promise<void> {
  await connectToDatabase();

  const result = await provider.processWebhook(rawBody, headers);
  const nextStatus = PROVIDER_TO_PAYMENT_STATUS[result.status];

  const updateFields: Record<string, unknown> = {
    status: nextStatus,
    rawProviderPayload: safeParse(rawBody),
  };

  if (nextStatus === "SUCCESSFUL") {
    updateFields.paidAt = result.paidAt ?? new Date();
    const pending = await Payment.findOne({
      providerReference: result.providerReference,
      status: "PENDING",
    });
    if (pending) {
      const organization = await Organization.findById(pending.organizationId);
      updateFields.receiptNumber = generateReceiptNumber(organization?.slug ?? "org");
    }
  }

  const payment = await Payment.findOneAndUpdate(
    { providerReference: result.providerReference, status: "PENDING" },
    { $set: updateFields },
    { new: true },
  );

  if (!payment) {
    const existing = await Payment.findOne({ providerReference: result.providerReference });
    if (!existing) {
      throw new PaymentError(
        `No payment found for provider reference "${result.providerReference}".`,
      );
    }
    return; // already processed by an earlier delivery — idempotent no-op
  }

  await PaymentStatusHistory.create({
    paymentId: payment._id,
    fromStatus: "PENDING",
    toStatus: nextStatus,
    reason: `provider:${provider.name}`,
  });

  await recordAudit({
    organizationId: payment.organizationId.toString(),
    action: "payment.status_changed",
    targetType: "Payment",
    targetId: payment._id.toString(),
    metadata: { from: "PENDING", to: nextStatus },
  });

  if (nextStatus === "SUCCESSFUL") {try {
      await allocateRevenueForPayment(payment);
    } catch (error) {
      console.error("Revenue allocation failed for payment", payment._id.toString(), error);
    }

    const contact = payment.studentSnapshot.email || payment.studentSnapshot.phone;
    if (contact) {
      const channel = payment.studentSnapshot.email ? "EMAIL" : "SMS";
      const studentName = payment.studentSnapshot.fullName;
      const amount = formatPesewas(payment.amountPesewas, payment.currency);
      await notificationProvider.send({
        channel,
        to: contact,
        subject: "Payment receipt",
        body: `Thank you, ${studentName}. Your payment of ${amount} for ${payment.duesConfigurationSnapshot.name} was successful. Receipt: ${payment.receiptNumber}. Reference: ${payment.providerReference}.`,
      });
    }
  }
}

function safeParse(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus;
  facultyId?: string;
  departmentId?: string;
  studentCategoryId?: string;
  academicLevelId?: string;
  paymentPeriodId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentPagination {
  page: number;
  pageSize: number;
}

export interface PaymentRecordSummary {
  paymentId: string;
  studentFullName: string;
  studentIndexNumber: string;
  amountPesewas: number;
  status: PaymentStatus;
  facultyAllocationPesewas: number | null;
  departmentAllocationPesewas: number | null;
  providerReference: string | null;
  paymentPeriodName: string;
  createdAt: Date;
  paidAt: Date | null;
}

/** Exported for `student-payment-matching.service.ts` (Phase 24) — reused as-is rather than duplicating the same filter shape. */
export function buildPaymentQuery(organizationId: string, filters: PaymentFilters): Record<string, unknown> {
  const query: Record<string, unknown> = { organizationId };

  if (filters.status) query.status = filters.status;
  if (filters.paymentPeriodId) query.paymentPeriodId = filters.paymentPeriodId;
  if (filters.facultyId) query["studentSnapshot.facultyId"] = filters.facultyId;
  if (filters.departmentId) query["studentSnapshot.departmentId"] = filters.departmentId;
  if (filters.studentCategoryId) query["studentSnapshot.studentCategoryId"] = filters.studentCategoryId;
  if (filters.academicLevelId) query["studentSnapshot.academicLevelId"] = filters.academicLevelId;

  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, Date> = {};
    if (filters.dateFrom) range.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setUTCHours(23, 59, 59, 999);
      range.$lte = end;
    }
    query.createdAt = range;
  }

  if (filters.search?.trim()) {
    const pattern = { $regex: escapeRegExp(filters.search.trim()), $options: "i" };
    query.$or = [{ studentIndexNumber: pattern }, { providerReference: pattern }];
  }

  return query;
}

export async function listPayments(
  actor: SessionUser,
  organizationId: string,
  filters: PaymentFilters,
  pagination: PaymentPagination,
): Promise<{ payments: PaymentRecordSummary[]; totalCount: number }> {
  assertCan(actor, "payment:view", { organizationId });
  await connectToDatabase();

  const query = buildPaymentQuery(organizationId, filters);
  const skip = (pagination.page - 1) * pagination.pageSize;

  const [payments, totalCount] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pagination.pageSize)
      .populate<{ paymentPeriodId: { name: string } | null }>("paymentPeriodId"),
    Payment.countDocuments(query),
  ]);

  const paymentIds = payments.map((payment) => payment._id);
  const allocations = await RevenueAllocation.find({
    paymentId: { $in: paymentIds },
    status: { $ne: "ADJUSTED" },
  });
  const allocationByPayment = new Map<string, { faculty?: number; department?: number }>();
  for (const allocation of allocations) {
    const key = allocation.paymentId.toString();
    allocationByPayment.set(key, {
      faculty: allocation.facultyShareAmountPesewas,
      department: allocation.departmentShareAmountPesewas,
    });
  }

  return {
    totalCount,
    payments: payments.map((payment) => {
      const allocation = allocationByPayment.get(payment._id.toString());
      return {
        paymentId: payment._id.toString(),
        studentFullName: payment.studentSnapshot.fullName,
        studentIndexNumber: payment.studentIndexNumber,
        amountPesewas: payment.amountPesewas,
        status: payment.status,
        facultyAllocationPesewas: allocation?.faculty ?? null,
        departmentAllocationPesewas: allocation?.department ?? null,
        providerReference: payment.providerReference ?? null,
        paymentPeriodName: payment.paymentPeriodId?.name ?? "—",
        createdAt: payment.createdAt,
        paidAt: payment.paidAt ?? null,
      };
    }),
  };
}

export interface PaymentDetails {
  paymentId: string;
  clientReference: string;
  status: PaymentStatus;
  amountPesewas: number;
  currency: string;
  studentFullName: string;
  studentIndexNumber: string;
  facultyName: string | null;
  departmentName: string | null;
  academicLevelName: string | null;
  studentCategoryName: string | null;
  duesConfigurationName: string;
  paymentPeriodName: string;
  provider: string;
  providerReference: string | null;
  receiptNumber: string | null;
  paidAt: Date | null;
  createdAt: Date;
  statusHistory: {
    fromStatus: PaymentStatus | null;
    toStatus: PaymentStatus;
    reason?: string;
    createdAt: Date;
  }[];
  ledgerEntry: {
    allocationId: string;
    facultyName: string | null;
    facultyShareAmountPesewas: number;
    departmentName: string | null;
    departmentShareAmountPesewas: number;
    deductionsTotalPesewas: number;
    status: "ALLOCATED" | "REVERSED" | "ADJUSTED";
    createdAt: Date;
  } | null;
  refunds: {
    refundId: string;
    amountPesewas: number;
    status: string;
    processedReference: string | null;
    processedAt: Date | null;
    createdAt: Date;
  }[];
}

export async function getPaymentDetails(
  actor: SessionUser,
  organizationId: string,
  paymentId: string,
): Promise<PaymentDetails> {
  assertCan(actor, "payment:view", { organizationId });
  await connectToDatabase();

  const payment = await Payment.findOne({ _id: paymentId, organizationId }).populate<{
    paymentPeriodId: { name: string } | null;
  }>("paymentPeriodId");
  if (!payment) {
    throw new PaymentError("Payment not found.");
  }

  const [statusHistory, ledgerEntry, refunds] = await Promise.all([
    PaymentStatusHistory.find({ paymentId: payment._id }).sort({ createdAt: 1 }),
    // The currently-active entry — whichever one isn't ADJUSTED (the
    // original, or its latest correction if it was ever adjusted).
    RevenueAllocation.findOne({ paymentId: payment._id, status: { $ne: "ADJUSTED" } }),
    Refund.find({ paymentId: payment._id }).sort({ createdAt: -1 }),
  ]);

  return {
    paymentId: payment._id.toString(),
    clientReference: payment.clientReference,
    status: payment.status,
    amountPesewas: payment.amountPesewas,
    currency: payment.currency,
    studentFullName: payment.studentSnapshot.fullName,
    studentIndexNumber: payment.studentIndexNumber,
    facultyName: payment.studentSnapshot.facultyName ?? null,
    departmentName: payment.studentSnapshot.departmentName ?? null,
    academicLevelName: payment.studentSnapshot.academicLevelName ?? null,
    studentCategoryName: payment.studentSnapshot.studentCategoryName ?? null,
    duesConfigurationName: payment.duesConfigurationSnapshot.name,
    paymentPeriodName: payment.paymentPeriodId?.name ?? "—",
    provider: payment.provider,
    providerReference: payment.providerReference ?? null,
    receiptNumber: payment.receiptNumber ?? null,
    paidAt: payment.paidAt ?? null,
    createdAt: payment.createdAt,
    statusHistory: statusHistory.map((h) => ({
      fromStatus: h.fromStatus ?? null,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
    ledgerEntry: ledgerEntry
      ? {
          allocationId: ledgerEntry._id.toString(),
          facultyName: ledgerEntry.facultyName ?? null,
          facultyShareAmountPesewas: ledgerEntry.facultyShareAmountPesewas,
          departmentName: ledgerEntry.departmentName ?? null,
          departmentShareAmountPesewas: ledgerEntry.departmentShareAmountPesewas,
          deductionsTotalPesewas: ledgerEntry.deductionsTotalPesewas,
          status: ledgerEntry.status,
          createdAt: ledgerEntry.createdAt,
        }
      : null,
    refunds: refunds.map((r) => ({
      refundId: r._id.toString(),
      amountPesewas: r.amountPesewas,
      status: r.status,
      processedReference: r.processedReference ?? null,
      processedAt: r.processedAt ?? null,
      createdAt: r.createdAt,
    })),
  };
}

export interface DuplicatePaymentMember {
  paymentId: string;
  amountPesewas: number;
  providerReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface DuplicatePaymentGroup {
  studentIndexNumber: string;
  studentFullName: string;
  duesConfigurationName: string;
  payments: DuplicatePaymentMember[];
}

export async function getDuplicatePaymentGroups(
  actor: SessionUser,
  organizationId: string,
): Promise<DuplicatePaymentGroup[]> {
  assertCan(actor, "payment:view", { organizationId });
  await connectToDatabase();

  const groups = await Payment.aggregate<{
    _id: { studentIndexNumber: string; duesConfigurationId: Types.ObjectId };
    paymentIds: Types.ObjectId[];
  }>([
    { $match: { organizationId: new Types.ObjectId(organizationId), status: "SUCCESSFUL" } },
    {
      $group: {
        _id: { studentIndexNumber: "$studentIndexNumber", duesConfigurationId: "$duesConfigurationId" },
        paymentIds: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (groups.length === 0) return [];

  const allPaymentIds = groups.flatMap((g) => g.paymentIds);
  const payments = await Payment.find({ _id: { $in: allPaymentIds } }).sort({ createdAt: 1 });
  const paymentsById = new Map(payments.map((p) => [p._id.toString(), p]));

  return groups.map((group) => {
    const members = group.paymentIds
      .map((id) => paymentsById.get(id.toString()))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    return {
      studentIndexNumber: group._id.studentIndexNumber,
      studentFullName: members[0]?.studentSnapshot.fullName ?? "—",
      duesConfigurationName: members[0]?.duesConfigurationSnapshot.name ?? "—",
      payments: members.map((payment) => ({
        paymentId: payment._id.toString(),
        amountPesewas: payment.amountPesewas,
        providerReference: payment.providerReference ?? null,
        paidAt: payment.paidAt ?? null,
        createdAt: payment.createdAt,
      })),
    };
  });
}

const STALE_PENDING_MINUTES = 30;

export interface PaymentMonitoringSnapshot {
  statusCounts: Record<PaymentStatus, number>;
  stalePending: {
    paymentId: string;
    studentFullName: string;
    studentIndexNumber: string;
    amountPesewas: number;
    createdAt: Date;
    ageMinutes: number;
  }[];
  recentActivity: {
    paymentId: string;
    studentIndexNumber: string;
    status: PaymentStatus;
    updatedAt: Date;
  }[];
}

export async function getPaymentMonitoringSnapshot(
  actor: SessionUser,
  organizationId: string,
): Promise<PaymentMonitoringSnapshot> {
  assertCan(actor, "payment:view", { organizationId });
  await connectToDatabase();

  const statuses: PaymentStatus[] = ["PENDING", "SUCCESSFUL", "FAILED", "CANCELLED", "REFUNDED"];
  const counts = await Promise.all(
    statuses.map((status) => Payment.countDocuments({ organizationId, status })),
  );
  const statusCounts = Object.fromEntries(
    statuses.map((status, index) => [status, counts[index]]),
  ) as Record<PaymentStatus, number>;

  const staleThreshold = new Date(Date.now() - STALE_PENDING_MINUTES * 60 * 1000);
  const stalePendingDocs = await Payment.find({
    organizationId,
    status: "PENDING",
    createdAt: { $lte: staleThreshold },
  })
    .sort({ createdAt: 1 })
    .limit(50);

  const recentDocs = await Payment.find({ organizationId }).sort({ updatedAt: -1 }).limit(20);

  const now = Date.now();
  return {
    statusCounts,
    stalePending: stalePendingDocs.map((payment) => ({
      paymentId: payment._id.toString(),
      studentFullName: payment.studentSnapshot.fullName,
      studentIndexNumber: payment.studentIndexNumber,
      amountPesewas: payment.amountPesewas,
      createdAt: payment.createdAt,
      ageMinutes: Math.round((now - payment.createdAt.getTime()) / 60000),
    })),
    recentActivity: recentDocs.map((payment) => ({
      paymentId: payment._id.toString(),
      studentIndexNumber: payment.studentIndexNumber,
      status: payment.status,
      updatedAt: payment.updatedAt,
    })),
  };
}

/** Org-scoped sibling of `dashboard.service.ts#getTransactionVolumeTrend` — same shape, same reusable `VolumeTrendChart`. */
export async function getOrgTransactionVolumeTrend(
  actor: SessionUser,
  organizationId: string,
  days = 14,
): Promise<VolumeTrendPoint[]> {
  assertCan(actor, "payment:view", { organizationId });
  await connectToDatabase();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = await Payment.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        organizationId: new Types.ObjectId(organizationId),
        status: "SUCCESSFUL",
        paidAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
        total: { $sum: "$amountPesewas" },
      },
    },
  ]);
  const totalsByDate = new Map(rows.map((row) => [row._id, row.total]));

  const points: VolumeTrendPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    points.push({ date: key, amountPesewas: totalsByDate.get(key) ?? 0 });
  }

  return points;
}

export interface CollectionReportRow {
  label: string;
  amountPesewas: number;
  count: number;
}

export interface CollectionReport {
  totalAmountPesewas: number;
  totalCount: number;
  byPeriod: CollectionReportRow[];
  byFaculty: CollectionReportRow[];
  byDepartment: CollectionReportRow[];
}

export async function getCollectionReport(
  actor: SessionUser,
  organizationId: string,
): Promise<CollectionReport> {
  assertCan(actor, "payment:view", { organizationId });
  await connectToDatabase();

  const orgObjectId = new Types.ObjectId(organizationId);
  const baseMatch = { organizationId: orgObjectId, status: "SUCCESSFUL" };

  const [totals, byPeriodRaw, byFacultyRaw, byDepartmentRaw] = await Promise.all([
    Payment.aggregate<{ total: number; count: number }>([
      { $match: baseMatch },
      { $group: { _id: null, total: { $sum: "$amountPesewas" }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate<{ _id: Types.ObjectId; total: number; count: number }>([
      { $match: baseMatch },
      { $group: { _id: "$paymentPeriodId", total: { $sum: "$amountPesewas" }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate<{ _id: Types.ObjectId | null; total: number; count: number }>([
      { $match: { ...baseMatch, "studentSnapshot.facultyId": { $ne: null } } },
      { $group: { _id: "$studentSnapshot.facultyId", total: { $sum: "$amountPesewas" }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate<{ _id: Types.ObjectId | null; total: number; count: number }>([
      { $match: { ...baseMatch, "studentSnapshot.departmentId": { $ne: null } } },
      { $group: { _id: "$studentSnapshot.departmentId", total: { $sum: "$amountPesewas" }, count: { $sum: 1 } } },
    ]),
  ]);

  const [periods, faculties, departments] = await Promise.all([
    PaymentPeriod.find({ _id: { $in: byPeriodRaw.map((r) => r._id) } }),
    Faculty.find({ _id: { $in: byFacultyRaw.map((r) => r._id).filter(Boolean) } }),
    Department.find({ _id: { $in: byDepartmentRaw.map((r) => r._id).filter(Boolean) } }),
  ]);
  const periodNameById = new Map(periods.map((p) => [p._id.toString(), p.name]));
  const facultyNameById = new Map(faculties.map((f) => [f._id.toString(), f.name]));
  const departmentNameById = new Map(departments.map((d) => [d._id.toString(), d.name]));

  const byRow = (
    raw: { _id: Types.ObjectId | null; total: number; count: number }[],
    nameById: Map<string, string>,
  ): CollectionReportRow[] =>
    raw
      .map((r) => ({
        label: (r._id && nameById.get(r._id.toString())) ?? "Unattributed",
        amountPesewas: r.total,
        count: r.count,
      }))
      .sort((a, b) => b.amountPesewas - a.amountPesewas);

  return {
    totalAmountPesewas: totals[0]?.total ?? 0,
    totalCount: totals[0]?.count ?? 0,
    byPeriod: byRow(byPeriodRaw, periodNameById),
    byFaculty: byRow(byFacultyRaw, facultyNameById),
    byDepartment: byRow(byDepartmentRaw, departmentNameById),
  };
}
