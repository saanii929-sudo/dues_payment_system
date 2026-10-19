import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listWithdrawalRequests, listSuperAdminWithdrawalQueue } from "@/services/withdrawal.service";
import type { WithdrawalRequestSummary } from "@/services/withdrawal.service";
import type { WithdrawalRequestStatus } from "@/models";
import { ApprovalsFilterForm } from "./approvals-filter-form";
import { ApprovalQueueTable } from "./approval-queue-table";

function paramString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

/**
 * The centralized Approval Queue (Phase 21) — the one place a Dean, HOD, or
 * Super Admin goes to see exactly what's awaiting their own decision,
 * across faculties/departments/orgs, instead of hunting through a full
 * financial dashboard. Additive: the existing dashboards and
 * `/super-admin/withdrawals` (which also handles fund release, outside this
 * page's Approve/Reject/Return scope) are unchanged. See ARCHITECTURE.md
 * Phase 21.
 */
export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const session = await verifySession();

  const isFirstStage = session.role === ROLES.FACULTY_DEAN || session.role === ROLES.DEPT_HOD;
  const isSuperAdmin = session.role === ROLES.SUPER_ADMIN;

  if (!isFirstStage && !isSuperAdmin) {
    redirect("/login");
  }
  if (isFirstStage && !session.organizationId) {
    redirect("/login");
  }

  const defaultStatus: WithdrawalRequestStatus = isSuperAdmin
    ? "PENDING_SUPER_ADMIN_APPROVAL"
    : "PENDING_DEAN_APPROVAL";

  const sp = await searchParams;
  const statusParam = paramString(sp.status);
  const effectiveStatus: WithdrawalRequestStatus | undefined =
    statusParam === undefined ? defaultStatus : statusParam === "ALL" ? undefined : (statusParam as WithdrawalRequestStatus);
  const currentFilter: WithdrawalRequestStatus | "ALL" = effectiveStatus ?? "ALL";

  let requests: WithdrawalRequestSummary[];
  const stage: "FIRST" | "SUPER_ADMIN" = isSuperAdmin ? "SUPER_ADMIN" : "FIRST";

  if (isSuperAdmin) {
    requests = await listSuperAdminWithdrawalQueue(session, { status: effectiveStatus });
  } else {
    if (!session.organizationId) redirect("/login");
    const organizationId = session.organizationId;

    if (session.role === ROLES.FACULTY_DEAN) {
      if (!session.facultyId) redirect("/login");
      requests = await listWithdrawalRequests(
        session,
        organizationId,
        { walletType: "FACULTY", facultyId: session.facultyId },
        { status: effectiveStatus },
      );
    } else {
      if (!session.departmentId) redirect("/login");
      requests = await listWithdrawalRequests(
        session,
        organizationId,
        { walletType: "DEPARTMENT", departmentId: session.departmentId },
        { status: effectiveStatus },
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Approval queue</h1>
        <p className="text-sm text-ink-muted">
          Withdrawal requests awaiting your decision{isSuperAdmin ? ", across every organization" : ""}.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <ApprovalsFilterForm current={currentFilter} defaultStatus={defaultStatus} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <ApprovalQueueTable requests={requests} stage={stage} />
      </div>
    </div>
  );
}
