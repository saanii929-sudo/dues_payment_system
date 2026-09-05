"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/utils/cn";

export interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  onConfirm: () => Promise<void>;
}

/**
 * Reusable confirmation gate for privileged actions (account deactivation,
 * fund releases, withdrawal approvals, ...) — the action only runs after an
 * explicit confirm, and any error from `onConfirm` is shown inline instead
 * of silently closing the dialog.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border bg-surface p-5 shadow-lg",
          )}
        >
          <Dialog.Title className="text-sm font-semibold text-ink">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-ink-muted">
            {description}
          </Dialog.Description>
          {error && (
            <p className="mt-3 rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm" disabled={pending}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant={confirmVariant}
              size="sm"
              disabled={pending}
              onClick={handleConfirm}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
