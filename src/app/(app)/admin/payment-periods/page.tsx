import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listPaymentPeriods } from "@/services/payment-period.service";
import { PaymentPeriodsTable } from "./payment-periods-table";
import { PaymentPeriodForm } from "./payment-period-form";

export default async function PaymentPeriodsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const periods = await listPaymentPeriods(session, session.organizationId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Payment periods</h1>
        <p className="text-sm text-ink-muted">
          Manage academic terms and mark one as the current period.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <PaymentPeriodsTable periods={periods} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Add a payment period</h2>
        <div className="mt-4">
          <PaymentPeriodForm />
        </div>
      </div>
    </div>
  );
}
