import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listSuperAdminWithdrawalQueue } from "@/services/withdrawal.service";
import type { WithdrawalRequestStatus } from "@/models";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/finance/money";
import { WITHDRAWAL_STATUS_VARIANT, WITHDRAWAL_STATUS_LABEL, formatDateTime } from "@/components/finance/withdrawal-status";
import { WithdrawalsFilterForm } from "./withdrawals-filter-form";
import { ReleaseFundsDialog } from "./release-funds-dialog";
import { WithdrawalHistoryDialog } from "./withdrawal-history-dialog";
import { WithdrawalDecisionActions } from "./withdrawal-decision-actions";

function paramString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function SuperAdminWithdrawalsPage({
  searchParams,
}: PageProps<"/super-admin/withdrawals">) {
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  const sp = await searchParams;
  const statusParam = paramString(sp.status);
  // No query param yet → default to the Super Admin's actual queue
  // (PENDING_SUPER_ADMIN_APPROVAL); "ALL" is an explicit opt-out of filtering.
  const effectiveStatus: WithdrawalRequestStatus | undefined =
    statusParam === undefined
      ? "PENDING_SUPER_ADMIN_APPROVAL"
      : statusParam === "ALL"
        ? undefined
        : (statusParam as WithdrawalRequestStatus);
  const currentFilter: WithdrawalRequestStatus | "ALL" = effectiveStatus ?? "ALL";

  const requests = await listSuperAdminWithdrawalQueue(session, { status: effectiveStatus });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Withdrawals</h1>
        <p className="text-sm text-ink-muted">
          Cross-organization queue — final approval and fund release for every Faculty/Department
          withdrawal request.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <WithdrawalsFilterForm current={currentFilter} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        {requests.length === 0 ? (
          <p className="text-sm text-ink-muted">No withdrawal requests in this status.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.withdrawalRequestId}>
                  <TableCell className="text-ink-muted">{request.organizationName ?? "—"}</TableCell>
                  <TableCell className="text-ink-muted">
                    {request.facultyName ?? request.departmentName ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium text-ink">
                    <Money amountPesewas={request.amountPesewas} />
                  </TableCell>
                  <TableCell className="text-ink-muted">{request.reason}</TableCell>
                  <TableCell className="text-ink-muted">
                    {request.destinationProvider} · {request.destinationAccountNumber}
                  </TableCell>
                  <TableCell className="text-ink-muted">{request.requestedByName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={WITHDRAWAL_STATUS_VARIANT[request.status]}>
                      {WITHDRAWAL_STATUS_LABEL[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-ink-muted">{formatDateTime(request.createdAt)}</TableCell>
                  <TableCell className="text-right space-x-1.5">
                    <WithdrawalHistoryDialog requestId={request.withdrawalRequestId} />
                    {request.status === "PENDING_SUPER_ADMIN_APPROVAL" && (
                      <WithdrawalDecisionActions requestId={request.withdrawalRequestId} />
                    )}
                    {request.status === "SUPER_ADMIN_APPROVED" && (
                      <ReleaseFundsDialog
                        requestId={request.withdrawalRequestId}
                        amountPesewas={request.amountPesewas}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
