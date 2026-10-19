"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { decideSuperAdminWithdrawalAction } from "./actions";

/**
 * A small client component wrapping the Approve/Reject `ConfirmDialog`s —
 * `page.tsx` is a Server Component, and a plain arrow closure defined there
 * (e.g. `() => decideSuperAdminWithdrawalAction(requestId, "APPROVED")`)
 * isn't a serializable Server Reference, only a `.bind()`'d action or a
 * client-side closure is. See ARCHITECTURE.md Phase 19.
 */
export function WithdrawalDecisionActions({ requestId }: { requestId: string }) {
  return (
    <>
      <ConfirmDialog
        trigger={
          <Button variant="secondary" size="sm">
            Approve
          </Button>
        }
        title="Approve this withdrawal request?"
        description="This does not release funds yet — a separate release step actually moves money."
        confirmLabel="Approve"
        onConfirm={() => decideSuperAdminWithdrawalAction(requestId, "APPROVED")}
      />
      <ConfirmDialog
        trigger={
          <Button variant="danger" size="sm">
            Reject
          </Button>
        }
        title="Reject this withdrawal request?"
        description="This is terminal — the requester will need to submit a new request if funds are still needed."
        confirmLabel="Reject"
        confirmVariant="danger"
        onConfirm={() => decideSuperAdminWithdrawalAction(requestId, "REJECTED")}
      />
    </>
  );
}
