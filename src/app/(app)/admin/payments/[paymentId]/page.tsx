import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getPaymentDetails } from "@/services/payment.service";
import { Money } from "@/components/finance/money";
import { LedgerStatusBadge } from "@/components/finance/ledger-status-badge";
import { PaymentStatusBadge } from "../status-badge";
import { RefundAction } from "../refund-action";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

export default async function PaymentDetailsPage({
  params,
}: PageProps<"/admin/payments/[paymentId]">) {
  const { paymentId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const payment = await getPaymentDetails(session, session.organizationId, paymentId);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{payment.studentFullName}</h1>
          <p className="text-sm text-ink-muted">
            {payment.studentIndexNumber} · {payment.duesConfigurationName}
          </p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Payment</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Amount" value={<Money amountPesewas={payment.amountPesewas} />} />
          <Row label="Payment period" value={payment.paymentPeriodName} />
          <Row label="Faculty" value={payment.facultyName ?? "—"} />
          <Row label="Department" value={payment.departmentName ?? "—"} />
          <Row label="Academic level" value={payment.academicLevelName ?? "—"} />
          <Row label="Student category" value={payment.studentCategoryName ?? "—"} />
          <Row label="Provider" value={payment.provider} />
          <Row label="Gateway reference" value={payment.providerReference ?? "—"} />
          <Row label="Receipt number" value={payment.receiptNumber ?? "—"} />
          <Row label="Initiated" value={formatDateTime(payment.createdAt)} />
          <Row label="Paid" value={payment.paidAt ? formatDateTime(payment.paidAt) : "—"} />
        </dl>
      </div>

      {payment.ledgerEntry && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Revenue allocation</h2>
            <LedgerStatusBadge status={payment.ledgerEntry.status} />
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row
              label={`FACULTY${payment.ledgerEntry.facultyName ? ` · ${payment.ledgerEntry.facultyName}` : ""}`}
              value={<Money amountPesewas={payment.ledgerEntry.facultyShareAmountPesewas} />}
            />
            <Row
              label={`DEPARTMENT${payment.ledgerEntry.departmentName ? ` · ${payment.ledgerEntry.departmentName}` : ""}`}
              value={<Money amountPesewas={payment.ledgerEntry.departmentShareAmountPesewas} />}
            />
            {payment.ledgerEntry.deductionsTotalPesewas > 0 && (
              <Row
                label="Deductions"
                value={<Money amountPesewas={payment.ledgerEntry.deductionsTotalPesewas} />}
              />
            )}
          </dl>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Status history</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {payment.statusHistory.map((entry, index) => (
            <li key={index} className="flex justify-between gap-4">
              <span className="text-ink-muted">
                {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}
              </span>
              <span className="text-ink-muted">{formatDateTime(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>

      {payment.refunds.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Refunds</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {payment.refunds.map((refund) => (
              <Row
                key={refund.refundId}
                label={`${refund.status} · ${formatDateTime(refund.createdAt)}`}
                value={<Money amountPesewas={refund.amountPesewas} />}
              />
            ))}
          </dl>
        </div>
      )}

      {payment.status === "SUCCESSFUL" && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Actions</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Refunding calls the real payment gateway and reverses any wallet allocations.
          </p>
          <div className="mt-3">
            <RefundAction paymentId={payment.paymentId} />
          </div>
        </div>
      )}
    </div>
  );
}
