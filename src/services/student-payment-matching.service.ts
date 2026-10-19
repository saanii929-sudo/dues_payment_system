import "@/lib/serverOnly";
import * as XLSX from "xlsx";
import { connectToDatabase } from "@/lib/db/connection";
import { StudentListUpload, StudentListEntry, StudentPaymentMatch, Payment } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { buildPaymentQuery, type PaymentFilters } from "@/services/payment.service";
import type { SessionUser } from "@/lib/permissions/roles";

export class StudentPaymentMatchingError extends Error {}

/** The report's row status — distinct from `StudentListRowStatus` (Phase 23) and `PaymentStatus`: this is the *matching result*, not a file-validation or payment-lifecycle status. See ARCHITECTURE.md Phase 24. */
export type MatchingRowStatus = "PAID" | "UNPAID" | "PENDING" | "FAILED" | "INVALID_INDEX_NUMBER";

interface MatchablePayment {
  paymentId: string;
  studentIndexNumber: string;
  studentFullName: string;
  amountPesewas: number;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "CANCELLED" | "REFUNDED";
  paidAt: Date | null;
  createdAt: Date;
}

/**
 * SUCCESSFUL > PENDING > everything else, applied across every payment
 * attempt sharing an index number — the literal "only successful payments
 * count as Paid" and "pending and failed payments must remain separate."
 * CANCELLED/REFUNDED fold into the FAILED bucket: neither is a current
 * success, and the phase's status list has no separate bucket for them.
 */
function deriveRowStatus(payments: MatchablePayment[]): MatchingRowStatus {
  if (payments.some((p) => p.status === "SUCCESSFUL")) return "PAID";
  if (payments.some((p) => p.status === "PENDING")) return "PENDING";
  if (payments.length > 0) return "FAILED"; // FAILED, CANCELLED, or REFUNDED only
  return "UNPAID";
}

/** The payment this row's status was actually decided by — the most recent one in the winning bucket, for display. */
function representativePayment(payments: MatchablePayment[], status: MatchingRowStatus): MatchablePayment | null {
  if (payments.length === 0) return null;
  const bucket =
    status === "PAID"
      ? payments.filter((p) => p.status === "SUCCESSFUL")
      : status === "PENDING"
        ? payments.filter((p) => p.status === "PENDING")
        : payments;
  return bucket.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

async function loadOwnedUpload(organizationId: string, uploadId: string) {
  const upload = await StudentListUpload.findOne({ _id: uploadId, organizationId });
  if (!upload) throw new StudentPaymentMatchingError("Upload not found.");
  return upload;
}

interface ScopedData {
  rosterRows: {
    entryId: string;
    indexNumber: string;
    fullName: string;
  }[];
  payments: MatchablePayment[];
}

async function loadScopedData(organizationId: string, uploadId: string, filters: PaymentFilters): Promise<ScopedData> {
  if (!filters.paymentPeriodId) {
    throw new StudentPaymentMatchingError("A payment period is required to run matching.");
  }

  const entries = await StudentListEntry.find({ uploadId });
  const rosterRows = entries
    .filter((entry) => entry.indexNumber && entry.indexNumber !== "(none)")
    .filter((entry) => !filters.facultyId || entry.facultyId?.toString() === filters.facultyId)
    .filter((entry) => !filters.departmentId || entry.departmentId?.toString() === filters.departmentId)
    .filter((entry) => !filters.academicLevelId || entry.academicLevelId?.toString() === filters.academicLevelId)
    .filter((entry) => !filters.studentCategoryId || entry.studentCategoryId?.toString() === filters.studentCategoryId)
    .map((entry) => ({
      entryId: entry._id.toString(),
      indexNumber: entry.indexNumber,
      fullName: entry.fullName,
    }));

  const query = buildPaymentQuery(organizationId, filters);
  const paymentDocs = await Payment.find(query).sort({ createdAt: 1 });
  const payments: MatchablePayment[] = paymentDocs.map((payment) => ({
    paymentId: payment._id.toString(),
    studentIndexNumber: payment.studentIndexNumber,
    studentFullName: payment.studentSnapshot.fullName,
    amountPesewas: payment.amountPesewas,
    status: payment.status,
    paidAt: payment.paidAt ?? null,
    createdAt: payment.createdAt,
  }));

  return { rosterRows, payments };
}

export interface MatchingRowResult {
  entryId: string;
  indexNumber: string;
  fullName: string;
  status: MatchingRowStatus;
  matchedAmountPesewas: number | null;
  matchedPaymentStatus: MatchablePayment["status"] | null;
  matchedAt: Date | null;
}

export interface NotMatchedPayment {
  paymentId: string;
  indexNumber: string;
  studentFullName: string;
  amountPesewas: number;
  status: MatchablePayment["status"];
  createdAt: Date;
}

export interface MatchingCounts {
  paid: number;
  unpaid: number;
  pending: number;
  failed: number;
  invalidIndexNumber: number;
  notMatched: number;
  matchingPercentage: number;
}

export interface PaymentMatchingReport {
  uploadId: string;
  fileName: string;
  invalidIndexNumberCount: number;
  counts: MatchingCounts;
  rows: MatchingRowResult[];
  notMatchedPayments: NotMatchedPayment[];
}

function computeReport(
  uploadId: string,
  fileName: string,
  totalEntryCount: number,
  data: ScopedData,
): PaymentMatchingReport {
  const paymentsByIndex = new Map<string, MatchablePayment[]>();
  for (const payment of data.payments) {
    const key = payment.studentIndexNumber.toLowerCase();
    const bucket = paymentsByIndex.get(key) ?? [];
    bucket.push(payment);
    paymentsByIndex.set(key, bucket);
  }

  const rosterIndexNumbers = new Set(data.rosterRows.map((r) => r.indexNumber.toLowerCase()));
  const invalidIndexNumberCount = totalEntryCount - data.rosterRows.length;

  const rows: MatchingRowResult[] = data.rosterRows.map((row) => {
    const matches = paymentsByIndex.get(row.indexNumber.toLowerCase()) ?? [];
    const status = deriveRowStatus(matches);
    const representative = representativePayment(matches, status);
    return {
      entryId: row.entryId,
      indexNumber: row.indexNumber,
      fullName: row.fullName,
      status,
      matchedAmountPesewas: representative?.amountPesewas ?? null,
      matchedPaymentStatus: representative?.status ?? null,
      matchedAt: representative?.paidAt ?? representative?.createdAt ?? null,
    };
  });

  const notMatchedPayments: NotMatchedPayment[] = data.payments
    .filter((p) => !rosterIndexNumbers.has(p.studentIndexNumber.toLowerCase()))
    .map((p) => ({
      paymentId: p.paymentId,
      indexNumber: p.studentIndexNumber,
      studentFullName: p.studentFullName,
      amountPesewas: p.amountPesewas,
      status: p.status,
      createdAt: p.createdAt,
    }));

  const paid = rows.filter((r) => r.status === "PAID").length;
  const unpaid = rows.filter((r) => r.status === "UNPAID").length;
  const pending = rows.filter((r) => r.status === "PENDING").length;
  const failed = rows.filter((r) => r.status === "FAILED").length;
  const validTotal = paid + unpaid + pending + failed;

  return {
    uploadId,
    fileName,
    invalidIndexNumberCount,
    counts: {
      paid,
      unpaid,
      pending,
      failed,
      invalidIndexNumber: invalidIndexNumberCount,
      notMatched: notMatchedPayments.length,
      matchingPercentage: validTotal > 0 ? Math.round((paid / validTotal) * 1000) / 10 : 0,
    },
    rows,
    notMatchedPayments,
  };
}

/**
 * The first run after an upload — computes the report and persists one
 * `StudentPaymentMatch` per considered payment (`MATCHED` when its index
 * number is on the roster, `UNMATCHED` otherwise), reusing a model that's
 * sat unused since Phase 1 for exactly this. See ARCHITECTURE.md Phase 24.
 */
export async function runPaymentMatching(
  actor: SessionUser,
  organizationId: string,
  uploadId: string,
  filters: PaymentFilters,
): Promise<PaymentMatchingReport> {
  assertCan(actor, "student-list:upload", { organizationId });
  await connectToDatabase();

  const upload = await loadOwnedUpload(organizationId, uploadId);
  const data = await loadScopedData(organizationId, uploadId, filters);
  const report = computeReport(uploadId, upload.fileName, upload.totalRows, data);

  const rosterByIndex = new Map(data.rosterRows.map((r) => [r.indexNumber.toLowerCase(), r]));
  await Promise.all(
    data.payments.map((payment) => {
      const rosterRow = rosterByIndex.get(payment.studentIndexNumber.toLowerCase());
      return StudentPaymentMatch.findOneAndUpdate(
        { paymentId: payment.paymentId },
        {
          $set: {
            organizationId,
            paymentId: payment.paymentId,
            studentListEntryId: rosterRow?.entryId,
            indexNumber: payment.studentIndexNumber,
            matchStatus: rosterRow ? "MATCHED" : "UNMATCHED",
            matchedAt: new Date(),
            matchedById: actor.userId,
          },
        },
        { upsert: true },
      );
    }),
  );

  return report;
}

/** Re-runs the same computation live, without writing `StudentPaymentMatch` again — used by the results page and export on every subsequent view. */
export async function getPaymentMatchingReport(
  actor: SessionUser,
  organizationId: string,
  uploadId: string,
  filters: PaymentFilters,
): Promise<PaymentMatchingReport> {
  assertCan(actor, "student-list:upload", { organizationId });
  await connectToDatabase();

  const upload = await loadOwnedUpload(organizationId, uploadId);
  const data = await loadScopedData(organizationId, uploadId, filters);
  return computeReport(uploadId, upload.fileName, upload.totalRows, data);
}

const MATCHING_STATUS_LABEL: Record<MatchingRowStatus, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  PENDING: "Pending",
  FAILED: "Failed",
  INVALID_INDEX_NUMBER: "Invalid Index Number",
};

export async function exportPaymentMatchingReport(
  actor: SessionUser,
  organizationId: string,
  uploadId: string,
  filters: PaymentFilters,
): Promise<Buffer> {
  const report = await getPaymentMatchingReport(actor, organizationId, uploadId, filters);

  const rosterSheetRows = [
    ["Index Number", "Full Name", "Status", "Matched Amount (GHS)", "Matched Payment Status", "Matched At"],
    ...report.rows.map((row) => [
      row.indexNumber,
      row.fullName,
      MATCHING_STATUS_LABEL[row.status],
      row.matchedAmountPesewas != null ? (row.matchedAmountPesewas / 100).toFixed(2) : "",
      row.matchedPaymentStatus ?? "",
      row.matchedAt ? row.matchedAt.toISOString() : "",
    ]),
  ];
  const notMatchedSheetRows = [
    ["Index Number", "Student Name (from payment)", "Amount (GHS)", "Payment Status", "Date"],
    ...report.notMatchedPayments.map((p) => [
      p.indexNumber,
      p.studentFullName,
      (p.amountPesewas / 100).toFixed(2),
      p.status,
      p.createdAt.toISOString(),
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rosterSheetRows), "Roster Matching");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(notMatchedSheetRows), "Not Matched Payments");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
