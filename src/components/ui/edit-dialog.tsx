"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./button";
import { cn } from "@/utils/cn";

export interface EditDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}

/**
 * Reusable edit-form shell — the edit counterpart to `ConfirmDialog`. Fields
 * are passed as children (plain inputs with `name` attributes); on submit the
 * whole form is handed to `onSubmit` as FormData, and any thrown error is
 * shown inline instead of silently closing the dialog.
 */
export function EditDialog({
  trigger,
  title,
  description,
  submitLabel = "Save changes",
  cancelLabel = "Cancel",
  onSubmit,
  children,
}: EditDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit(new FormData(event.currentTarget));
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
        if (pending) return;
        setOpen(next);
        if (!next) setError(null);
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
          {description ? (
            <Dialog.Description className="mt-1 text-sm text-ink-muted">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {children}
            {error && (
              <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" size="sm" disabled={pending}>
                  {cancelLabel}
                </Button>
              </Dialog.Close>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : submitLabel}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
