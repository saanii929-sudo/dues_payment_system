import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getDuplicatePaymentGroups } from "@/services/payment.service";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import { RefundAction } from "../refund-action";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}

export default async function DuplicatePaymentsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const groups = await getDuplicatePaymentGroups(session, session.organizationId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Duplicate payment review</h1>
        <p className="text-sm text-ink-muted">
          Students pay by index number with no account, so nothing stops the same person paying
          the same dues twice. These are index numbers with more than one Successful payment for
          the same dues configuration.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-ink-muted">No duplicate payments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={`${group.studentIndexNumber}-${group.duesConfigurationName}`}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{group.studentFullName}</p>
                  <p className="text-xs text-ink-muted">
                    {group.studentIndexNumber} · {group.duesConfigurationName}
                  </p>
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-danger">
                  {group.payments.length} successful payments
                </span>
              </div>

              <ul className="mt-4 divide-y divide-border">
                {group.payments.map((payment) => (
                  <li key={payment.paymentId} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        <Money amountPesewas={payment.amountPesewas} />
                      </p>
                      <p className="text-xs text-ink-muted">
                        {payment.paidAt ? formatDateTime(payment.paidAt) : "—"} ·{" "}
                        {payment.providerReference ?? "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/payments/${payment.paymentId}`}>View</Link>
                      </Button>
                      <RefundAction paymentId={payment.paymentId} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
