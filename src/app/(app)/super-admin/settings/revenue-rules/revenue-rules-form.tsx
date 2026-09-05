"use client";

import { useActionState } from "react";
import { updateRevenueRulesAction, type RevenueRulesFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IPlatformRevenueSplit } from "@/models";

const initialState: RevenueRulesFormState = {};

function findPercent(splits: IPlatformRevenueSplit[], type: string): number {
  const split = splits.find((s) => s.beneficiaryType === type);
  return split ? split.percentageBps / 100 : 0;
}

export function RevenueRulesForm({ splits }: { splits: IPlatformRevenueSplit[] }) {
  const [state, action, pending] = useActionState(updateRevenueRulesAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="organizationPercent">Organization %</Label>
        <Input
          id="organizationPercent"
          name="organizationPercent"
          type="number"
          min={0}
          max={100}
          step="0.01"
          defaultValue={findPercent(splits, "ORGANIZATION")}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="facultyPercent">Faculty %</Label>
        <Input
          id="facultyPercent"
          name="facultyPercent"
          type="number"
          min={0}
          max={100}
          step="0.01"
          defaultValue={findPercent(splits, "FACULTY")}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="departmentPercent">Department %</Label>
        <Input
          id="departmentPercent"
          name="departmentPercent"
          type="number"
          min={0}
          max={100}
          step="0.01"
          defaultValue={findPercent(splits, "DEPARTMENT")}
          required
        />
      </div>
      <p className="text-xs text-ink-muted">
        Must sum to 100%. Applied to new organizations only — existing organizations keep their
        own rule.
      </p>
      {state?.error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-md bg-success-muted px-3 py-2 text-sm text-success">Saved.</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
