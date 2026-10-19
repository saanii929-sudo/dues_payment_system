import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import {
  getPaymentPeriodDetails,
  PAYMENT_PERIOD_TRANSITIONS,
} from "@/services/payment-period.service";
import { PaymentPeriodStatusBadge } from "../status-badge";
import { EditPaymentPeriodForm } from "./edit-payment-period-form";
import { PaymentPeriodStatusActions } from "./payment-period-status-actions";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString();
}

export default async function PaymentPeriodDetailsPage({
  params,
}: PageProps<"/admin/payment-periods/[paymentPeriodId]">) {
  const { paymentPeriodId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const period = await getPaymentPeriodDetails(session, session.organizationId, paymentPeriodId);
  const nextStatuses = PAYMENT_PERIOD_TRANSITIONS[period.status];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{period.name}</h1>
          <p className="text-sm text-ink-muted">
            {period.code} · {period.academicYear}
          </p>
        </div>
        <PaymentPeriodStatusBadge status={period.status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Academic dates
          </p>
          <p className="mt-1.5 text-sm text-ink">
            {formatDate(period.startDate)} – {formatDate(period.endDate)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Payment window
          </p>
          <p className="mt-1.5 text-sm text-ink">
            {formatDate(period.paymentOpenDate)} – {formatDate(period.paymentCloseDate)}
          </p>
        </div>
      </div>

      {period.description && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Description</p>
          <p className="mt-1.5 text-sm text-ink">{period.description}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Status</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Move this period through its lifecycle. Only valid next steps are shown.
        </p>
        <div className="mt-4">
          <PaymentPeriodStatusActions paymentPeriodId={period.paymentPeriodId} nextStatuses={nextStatuses} />
        </div>
      </div>

      {period.status !== "ARCHIVED" ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Edit period</h2>
          <div className="mt-4">
            <EditPaymentPeriodForm period={period} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Archived periods are historical record and can no longer be edited.</p>
      )}
    </div>
  );
}
