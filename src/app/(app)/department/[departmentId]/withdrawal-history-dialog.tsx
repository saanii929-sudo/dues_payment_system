"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/finance/money";
import { WITHDRAWAL_STATUS_LABEL, formatDateTime } from "@/components/finance/withdrawal-status";
import { cn } from "@/utils/cn";
import type { WithdrawalRequestDetails } from "@/services/withdrawal.service";
import { getWithdrawalHistoryAction } from "./actions";

/** Reconstructs the full timeline from `AuditLog` — every write in `withdrawal.service.ts` is audited, so this is complete even for the transient `DEAN_APPROVED` step. Port of Faculty's history dialog (Phase 19). See ARCHITECTURE.md Phase 20. */
export function WithdrawalHistoryDialog({
  departmentId,
  requestId,
}: {
  departmentId: string;
  requestId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<WithdrawalRequestDetails | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await getWithdrawalHistoryAction(departmentId, requestId);
      setDetails(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button" variant="ghost" size="sm">
          History
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-lg",
          )}
        >
          <Dialog.Title className="text-base font-semibold text-ink">Withdrawal request history</Dialog.Title>
          <Dialog.Description className="sr-only">
            Full timeline of every status change for this withdrawal request.
          </Dialog.Description>

          <div className="mt-4 space-y-4">
            {loading && <p className="text-sm text-ink-muted">Loading…</p>}
            {error && <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>}

            {details && (
              <>
                <dl className="space-y-2 rounded-md border border-border bg-surface-muted p-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Amount</dt>
                    <dd className="font-medium text-ink">
                      <Money amountPesewas={details.amountPesewas} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Current status</dt>
                    <dd className="font-medium text-ink">{WITHDRAWAL_STATUS_LABEL[details.status]}</dd>
                  </div>
                  {details.correctionNote && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Correction note</dt>
                      <dd className="font-medium text-ink">{details.correctionNote}</dd>
                    </div>
                  )}
                  {details.settlement && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Settlement reference</dt>
                      <dd className="font-medium text-ink">{details.settlement.reference}</dd>
                    </div>
                  )}
                </dl>

                <div>
                  <h3 className="text-xs font-semibold uppercase text-ink-muted">Timeline</h3>
                  <ol className="mt-2 space-y-2">
                    {details.history.map((entry, index) => (
                      <li
                        key={`${entry.action}-${index}`}
                        className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-ink">{entry.action}</p>
                          <p className="text-xs text-ink-muted">
                            {entry.fromStatus ?? "—"} → {entry.toStatus ?? "—"}
                            {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
                          </p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-ink-muted">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </li>
                    ))}
                    {details.history.length === 0 && (
                      <li className="text-sm text-ink-muted">No history yet.</li>
                    )}
                  </ol>
                </div>

                {details.approvals.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-ink-muted">Decisions</h3>
                    <ol className="mt-2 space-y-2">
                      {details.approvals.map((approval, index) => (
                        <li
                          key={index}
                          className="rounded-md border border-border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant={approval.decision === "APPROVED" ? "success" : approval.decision === "RETURNED" ? "pending" : "danger"}>
                              {approval.stage === "FIRST" ? "First stage" : "Super Admin"} · {approval.decision}
                            </Badge>
                            <span className="text-xs text-ink-muted">{formatDateTime(approval.decidedAt)}</span>
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">
                            {approval.approverName ?? approval.approverRole}
                            {approval.comment ? ` — "${approval.comment}"` : ""}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="secondary" size="sm">
                Close
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
