import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getPaymentMatchingReport, StudentPaymentMatchingError } from "@/services/student-payment-matching.service";
import type { PaymentFilters } from "@/services/payment.service";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { MatchingResultsTable } from "./matching-results-table";
import { NotMatchedTable } from "./not-matched-table";

function paramString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function PaymentMatchingResultsPage({
  params,
  searchParams,
}: PageProps<"/admin/payment-matching/[uploadId]">) {
  const { uploadId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const sp = await searchParams;
  const filters: PaymentFilters = {
    paymentPeriodId: paramString(sp.paymentPeriodId),
    facultyId: paramString(sp.facultyId),
    departmentId: paramString(sp.departmentId),
    academicLevelId: paramString(sp.academicLevelId),
    studentCategoryId: paramString(sp.studentCategoryId),
  };

  let report;
  try {
    report = await getPaymentMatchingReport(session, session.organizationId, uploadId, filters);
  } catch (error) {
    if (error instanceof StudentPaymentMatchingError) redirect("/admin/payment-matching");
    throw error;
  }

  const exportHref = `/api/admin/payment-matching/${uploadId}/export?${new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{report.fileName}</h1>
          <p className="text-sm text-ink-muted">Payment matching results</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <a href={exportHref}>Export report</a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Matching %" value={`${report.counts.matchingPercentage}%`} accent="success" />
        <StatTile label="Paid" value={String(report.counts.paid)} accent="success" />
        <StatTile label="Unpaid" value={String(report.counts.unpaid)} />
        <StatTile label="Pending" value={String(report.counts.pending)} accent="pending" />
        <StatTile label="Failed" value={String(report.counts.failed)} accent="danger" />
        <StatTile label="Invalid index number" value={String(report.counts.invalidIndexNumber)} accent="danger" />
        <StatTile label="Not matched" value={String(report.counts.notMatched)} accent="pending" />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Roster matching</h2>
        <div className="rounded-lg border border-border bg-surface p-4">
          <MatchingResultsTable rows={report.rows} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Not matched payments</h2>
        <p className="text-xs text-ink-muted">
          Payments in this scope whose index number doesn&apos;t appear anywhere in the uploaded list.
        </p>
        <div className="rounded-lg border border-border bg-surface p-4">
          <NotMatchedTable payments={report.notMatchedPayments} />
        </div>
      </div>

      <Link href="/admin/payment-matching" className="text-sm text-accent hover:underline">
        ← Run another match
      </Link>
    </div>
  );
}
