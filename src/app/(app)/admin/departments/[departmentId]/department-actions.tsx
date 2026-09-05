"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deactivateDepartmentDetailAction, reactivateDepartmentDetailAction } from "./actions";

export function DepartmentActions({
  departmentId,
  isActive,
  departmentName,
}: {
  departmentId: string;
  isActive: boolean;
  departmentName: string;
}) {
  if (isActive) {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="danger" size="sm">
            Deactivate department
          </Button>
        }
        title="Deactivate this department?"
        description={`${departmentName} will be hidden from new assignments.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        onConfirm={() => deactivateDepartmentDetailAction(departmentId)}
      />
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" size="sm">
          Reactivate department
        </Button>
      }
      title="Reactivate this department?"
      description={`${departmentName} will be available again.`}
      confirmLabel="Reactivate"
      onConfirm={() => reactivateDepartmentDetailAction(departmentId)}
    />
  );
}
