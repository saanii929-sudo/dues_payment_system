"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/finance/money";
import { cn } from "@/utils/cn";
import type { WithdrawalRequestSummary } from "@/services/withdrawal.service";
import {
  saveDraftWithdrawalAction,
  saveAndSubmitWithdrawalAction,
  updateDraftWithdrawalAction,
} from "./actions";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface FormState {
  amount: string;
  reason: string;
  destinationMethod: "BANK_TRANSFER" | "MOBILE_MONEY";
  destinationAccountName: string;
  destinationAccountNumber: string;
  destinationProvider: string;
}

function emptyState(): FormState {
  return {
    amount: "",
    reason: "",
    destinationMethod: "BANK_TRANSFER",
    destinationAccountName: "",
    destinationAccountNumber: "",
    destinationProvider: "",
  };
}

function stateFromExisting(request: WithdrawalRequestSummary): FormState {
  return {
    amount: (request.amountPesewas / 100).toFixed(2),
    reason: request.reason,
    destinationMethod: request.destinationMethod,
    destinationAccountName: request.destinationAccountName,
    destinationAccountNumber: request.destinationAccountNumber,
    destinationProvider: request.destinationProvider,
  };
}

/**
 * Faculty's own withdrawal dialog (Phase 19) — genuinely different from the
 * shared `RequestWithdrawalDialog` used by Department: creating a new
 * request offers "Save as draft" and "Save & submit" (mirroring
 * `dues-configuration-modal.tsx`'s two-button pattern), while editing an
 * existing Draft/Returned row is a single "Save changes" — resubmission
 * after an edit is its own explicit row action. See ARCHITECTURE.md Phase 19.
 */
export function WithdrawalRequestDialog({
  trigger,
  facultyId,
  availableBalancePesewas,
  existing,
}: {
  trigger: React.ReactNode;
  facultyId: string;
  availableBalancePesewas: number;
  existing?: WithdrawalRequestSummary;
}) {
  const isEdit = Boolean(existing);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(() =>
    existing ? stateFromExisting(existing) : emptyState(),
  );
  const [pendingAction, setPendingAction] = React.useState<"draft" | "submit" | "save" | null>(null);
  const pending = pendingAction !== null;
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toFormData(): FormData {
    const data = new FormData();
    data.set("amount", form.amount);
    data.set("reason", form.reason);
    data.set("destinationMethod", form.destinationMethod);
    data.set("destinationAccountName", form.destinationAccountName);
    data.set("destinationAccountNumber", form.destinationAccountNumber);
    data.set("destinationProvider", form.destinationProvider);
    return data;
  }

  async function submit(action: "draft" | "submit" | "save") {
    setPendingAction(action);
    setError(null);
    try {
      if (action === "save" && existing) {
        await updateDraftWithdrawalAction(facultyId, existing.withdrawalRequestId, toFormData());
      } else if (action === "submit") {
        await saveAndSubmitWithdrawalAction(facultyId, toFormData());
      } else {
        await saveDraftWithdrawalAction(facultyId, toFormData());
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPendingAction(null);
    }
  }

  const valid = Boolean(
    form.amount &&
      form.reason.trim() &&
      form.destinationAccountName.trim() &&
      form.destinationAccountNumber.trim() &&
      form.destinationProvider.trim(),
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) {
          setForm(existing ? stateFromExisting(existing) : emptyState());
          setError(null);
        }
        setOpen(next);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border bg-surface p-6 shadow-lg",
          )}
        >
          <Dialog.Title className="text-base font-semibold text-ink">
            {isEdit ? "Edit withdrawal request" : "New withdrawal request"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-ink-muted">
            Available balance: <Money amountPesewas={availableBalancePesewas} />
          </Dialog.Description>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wr-amount">Amount (GHS)</Label>
              <Input
                id="wr-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={(availableBalancePesewas / 100).toFixed(2)}
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wr-reason">Reason</Label>
              <Textarea
                id="wr-reason"
                rows={3}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wr-destinationMethod">Destination method</Label>
                <select
                  id="wr-destinationMethod"
                  className={selectClassName}
                  value={form.destinationMethod}
                  onChange={(e) => set("destinationMethod", e.target.value as FormState["destinationMethod"])}
                >
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wr-destinationProvider">Bank / provider</Label>
                <Input
                  id="wr-destinationProvider"
                  value={form.destinationProvider}
                  onChange={(e) => set("destinationProvider", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wr-destinationAccountName">Account name</Label>
                <Input
                  id="wr-destinationAccountName"
                  value={form.destinationAccountName}
                  onChange={(e) => set("destinationAccountName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wr-destinationAccountNumber">Account number</Label>
                <Input
                  id="wr-destinationAccountNumber"
                  value={form.destinationAccountNumber}
                  onChange={(e) => set("destinationAccountNumber", e.target.value)}
                />
              </div>
            </div>

            {error && <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="sm" disabled={pending}>
                Cancel
              </Button>
            </Dialog.Close>
            {isEdit ? (
              <Button type="button" size="sm" disabled={pending || !valid} onClick={() => submit("save")}>
                {pendingAction === "save" ? "Saving…" : "Save changes"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending || !valid}
                  onClick={() => submit("draft")}
                >
                  {pendingAction === "draft" ? "Saving…" : "Save as draft"}
                </Button>
                <Button type="button" size="sm" disabled={pending || !valid} onClick={() => submit("submit")}>
                  {pendingAction === "submit" ? "Submitting…" : "Save & submit"}
                </Button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
