import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getPaymentMonitoringSnapshot } from "@/services/payment.service";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "../status-badge";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}

export default async function PaymentMonitoringPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const snapshot = await getPaymentMonitoringSnapshot(session, session.organizationId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Payment monitoring</h1>
        <p className="text-sm text-ink-muted">What&apos;s happening right now, and what&apos;s stuck.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Pending"
          value={String(snapshot.statusCounts.PENDING)}
          accent="pending"
        />
        <StatTile
          label="Successful"
          value={String(snapshot.statusCounts.SUCCESSFUL)}
          accent="success"
        />
        <StatTile label="Failed" value={String(snapshot.statusCounts.FAILED)} accent="danger" />
        <StatTile label="Cancelled" value={String(snapshot.statusCounts.CANCELLED)} />
        <StatTile label="Refunded" value={String(snapshot.statusCounts.REFUNDED)} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Stale pending payments</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pending for over 30 minutes — likely an abandoned checkout or a webhook that never
          arrived.
        </p>
        {snapshot.stalePending.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">None right now.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {snapshot.stalePending.map((payment) => (
              <li key={payment.paymentId} className="flex items-center justify-between gap-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">{payment.studentFullName}</p>
                  <p className="text-xs text-ink-muted">
                    {payment.studentIndexNumber} · <Money amountPesewas={payment.amountPesewas} /> ·{" "}
                    {payment.ageMinutes} min ago
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/admin/payments/${payment.paymentId}`}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
        {snapshot.recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {snapshot.recentActivity.map((entry) => (
              <li key={entry.paymentId} className="flex items-center justify-between gap-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-muted">{entry.studentIndexNumber}</span>
                  <PaymentStatusBadge status={entry.status} />
                </div>
                <span className="text-xs text-ink-muted">{formatDateTime(entry.updatedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
