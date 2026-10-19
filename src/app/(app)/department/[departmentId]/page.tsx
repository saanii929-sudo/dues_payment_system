import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES, DEPARTMENT_ROLES } from "@/lib/permissions/roles";
import { getDepartmentDashboardMetrics } from "@/services/dashboard.service";
import { listWithdrawalRequests } from "@/services/withdrawal.service";
import { listWalletTransactions } from "@/services/wallet.service";
import { StatTile } from "@/components/dashboard/stat-tile";
import { formatPesewas } from "@/lib/format/currency";
import { DepartmentDashboardFilterForm } from "./department-dashboard-filter-form";
import { DepartmentWithdrawalTable } from "./department-withdrawal-table";
import { WithdrawalRequestDialog } from "./withdrawal-request-dialog";
import { WalletTransactionsTable } from "@/components/finance/wallet-transactions-table";
import { Button } from "@/components/ui/button";

function paramString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function DepartmentPage({
  params,
  searchParams,
}: PageProps<"/department/[departmentId]">) {
  const { departmentId } = await params;
  const session = await verifySession();

  // A department executive may only view their own department, matched
  // against the session's scope — never the URL alone. An org admin/super
  // admin can view any department in their org. See ARCHITECTURE.md Phase 16.
  const isOwnDepartment =
    DEPARTMENT_ROLES.includes(session.role) && session.departmentId === departmentId;
  const allowed =
    session.role === ROLES.SUPER_ADMIN || session.role === ROLES.ORG_ADMIN || isOwnDepartment;

  if (!allowed || !session.organizationId) {
    redirect("/login");
  }

  const organizationId = session.organizationId;
  const sp = await searchParams;
  const currentFilters = {
    studentCategoryId: paramString(sp.studentCategoryId),
    academicLevelId: paramString(sp.academicLevelId),
    paymentPeriodId: paramString(sp.paymentPeriodId),
    dateFrom: paramString(sp.dateFrom),
    dateTo: paramString(sp.dateTo),
  };

  const [metrics, withdrawalRequests, walletTransactions] = await Promise.all([
    getDepartmentDashboardMetrics(session, organizationId, departmentId, currentFilters),
    listWithdrawalRequests(session, organizationId, { walletType: "DEPARTMENT", departmentId }),
    listWalletTransactions(session, organizationId, { walletType: "DEPARTMENT", departmentId }),
  ]);

  const isTreasurer = session.role === ROLES.DEPT_TREASURER || session.role === ROLES.DEPT_PRESIDENT;
  const isHod = session.role === ROLES.DEPT_HOD;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">{metrics.departmentName}</h1>
        <p className="text-sm text-ink-muted">Financial dashboard</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <DepartmentDashboardFilterForm
          departmentId={departmentId}
          current={currentFilters}
          options={metrics.filterOptions}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Collection</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            label="Total dues collected"
            value={formatPesewas(metrics.totalDuesCollectedPesewas)}
          />
          <StatTile
            label="Department share earned"
            value={formatPesewas(metrics.departmentShareEarnedPesewas)}
            accent="success"
          />
          <StatTile label="Successful payments" value={String(metrics.successfulPaymentsCount)} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Wallet &amp; withdrawals</h2>
          <p className="text-xs text-ink-muted">Always current — not affected by the filters above</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            label="Available balance"
            value={formatPesewas(metrics.availableBalancePesewas)}
            accent="success"
          />
          <StatTile
            label="Department share withdrawn"
            value={formatPesewas(metrics.departmentShareWithdrawnPesewas)}
          />
          <StatTile
            label="Pending withdrawals"
            value={formatPesewas(metrics.pendingWithdrawals.amountPesewas)}
            accent="pending"
            hint={`${metrics.pendingWithdrawals.count} request${metrics.pendingWithdrawals.count === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Approved withdrawals"
            value={formatPesewas(metrics.approvedWithdrawals.amountPesewas)}
            hint={`${metrics.approvedWithdrawals.count} request${metrics.approvedWithdrawals.count === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Released withdrawals"
            value={formatPesewas(metrics.releasedWithdrawals.amountPesewas)}
            accent="success"
            hint={`${metrics.releasedWithdrawals.count} request${metrics.releasedWithdrawals.count === 1 ? "" : "s"}`}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Withdrawal requests</h2>
          {isTreasurer && (
            <WithdrawalRequestDialog
              trigger={<Button size="sm">New request</Button>}
              departmentId={departmentId}
              availableBalancePesewas={metrics.availableBalancePesewas}
            />
          )}
        </div>
        <DepartmentWithdrawalTable
          departmentId={departmentId}
          requests={withdrawalRequests}
          availableBalancePesewas={metrics.availableBalancePesewas}
          isTreasurer={isTreasurer}
          isHod={isHod}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <h2 className="text-sm font-semibold text-ink">Wallet transactions</h2>
        <WalletTransactionsTable transactions={walletTransactions} />
      </div>
    </div>
  );
}
