"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/finance/money";
import { releaseWithdrawalFundsAction } from "./actions";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** "Super Admin Fund Release" — the last manual step before money actually moves. See ARCHITECTURE.md Phase 19. */
export function ReleaseFundsDialog({
  requestId,
  amountPesewas,
}: {
  requestId: string;
  amountPesewas: number;
}) {
  return (
    <EditDialog
      trigger={<Button size="sm">Release funds</Button>}
      title="Release withdrawal funds"
      description={`This debits the wallet by ${amountPesewas} pesewas and records a settlement.`}
      submitLabel="Release funds"
      onSubmit={releaseWithdrawalFundsAction.bind(null, requestId)}
    >
      <div className="rounded-md border border-border bg-surface-muted p-3 text-sm">
        <span className="text-ink-muted">Amount: </span>
        <Money amountPesewas={amountPesewas} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="release-method">Settlement method</Label>
        <select id="release-method" name="method" required className={selectClassName} defaultValue="BANK_TRANSFER">
          <option value="BANK_TRANSFER">Bank transfer</option>
          <option value="MOBILE_MONEY">Mobile money</option>
          <option value="HUBTEL_PAYOUT">Hubtel payout</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="release-reference">Settlement reference</Label>
        <Input id="release-reference" name="reference" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="release-proofUrl">Proof URL (optional)</Label>
        <Input id="release-proofUrl" name="proofUrl" type="url" />
      </div>
    </EditDialog>
  );
}
