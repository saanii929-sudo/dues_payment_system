import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { WITHDRAWAL_STATUS_LABEL } from "@/components/finance/withdrawal-status";
import type { WithdrawalRequestStatus } from "@/models";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const ALL_STATUSES = Object.keys(WITHDRAWAL_STATUS_LABEL) as WithdrawalRequestStatus[];

/** Defaults to "awaiting my decision" (`defaultStatus`); "All statuses" is an explicit opt-out to review already-decided items. Mirrors `super-admin/withdrawals/withdrawals-filter-form.tsx`. See ARCHITECTURE.md Phase 21. */
export function ApprovalsFilterForm({
  current,
  defaultStatus,
}: {
  current: WithdrawalRequestStatus | "ALL";
  defaultStatus: WithdrawalRequestStatus;
}) {
  return (
    <form method="get" className="flex items-end gap-3">
      <div className="w-64 space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" defaultValue={current} className={selectClassName}>
          <option value="ALL">All statuses</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {WITHDRAWAL_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm">
        Apply
      </Button>
      {current !== defaultStatus && (
        <Button asChild variant="ghost" size="sm">
          <Link href="/approvals">Reset to awaiting my decision</Link>
        </Button>
      )}
    </form>
  );
}
