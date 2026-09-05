"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deactivateFacultyDetailAction, reactivateFacultyDetailAction } from "./actions";

export function FacultyActions({
  facultyId,
  isActive,
  facultyName,
}: {
  facultyId: string;
  isActive: boolean;
  facultyName: string;
}) {
  if (isActive) {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="danger" size="sm">
            Deactivate faculty
          </Button>
        }
        title="Deactivate this faculty?"
        description={`${facultyName} and its departments will be hidden from new assignments.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        onConfirm={() => deactivateFacultyDetailAction(facultyId)}
      />
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" size="sm">
          Reactivate faculty
        </Button>
      }
      title="Reactivate this faculty?"
      description={`${facultyName} will be available again.`}
      confirmLabel="Reactivate"
      onConfirm={() => reactivateFacultyDetailAction(facultyId)}
    />
  );
}
