"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/finance/money";
import { adjustLedgerEntryAction } from "./actions";
import type { LedgerEntrySummary } from "@/services/revenue-allocation.service";

export function AdjustLedgerEntryDialog({ entry }: { entry: LedgerEntrySummary }) {
  return (
    <EditDialog
      trigger={
        <Button variant="secondary" size="sm">
          Adjust
        </Button>
      }
      title="Adjust allocation"
      description="Corrects the Faculty/Department split without erasing history — the current entry is marked Adjusted and a new entry records the correction."
      submitLabel="Save adjustment"
      size="lg"
      onSubmit={(formData) => adjustLedgerEntryAction(entry.allocationId, formData)}
    >
      <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-surface-muted p-3 text-sm">
        <div>
          <p className="text-xs text-ink-muted">Current Faculty share</p>
          <p className="font-medium text-ink">
            <Money amountPesewas={entry.facultyShareAmountPesewas} />
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Current Department share</p>
          <p className="font-medium text-ink">
            <Money amountPesewas={entry.departmentShareAmountPesewas} />
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`adj-amount-${entry.allocationId}`}>New Faculty share (GHS)</Label>
        <Input
          id={`adj-amount-${entry.allocationId}`}
          name="newFacultyShareAmount"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={(entry.facultyShareAmountPesewas / 100).toFixed(2)}
        />
        <p className="text-xs text-ink-muted">
          Department share is recalculated automatically: total paid minus this amount minus
          deductions already applied ({(entry.deductionsTotalPesewas / 100).toFixed(2)} GHS).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`adj-reason-${entry.allocationId}`}>Reason</Label>
        <Textarea id={`adj-reason-${entry.allocationId}`} name="reason" required rows={3} />
      </div>
    </EditDialog>
  );
}
