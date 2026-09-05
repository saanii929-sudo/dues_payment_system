"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deactivateOrganizationAction, reactivateOrganizationAction } from "./actions";

export function OrganizationActions({
  organizationId,
  isActive,
  organizationName,
}: {
  organizationId: string;
  isActive: boolean;
  organizationName: string;
}) {
  if (isActive) {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="danger" size="sm">
            Deactivate organization
          </Button>
        }
        title="Deactivate this organization?"
        description={`${organizationName}'s admins will lose access immediately, until reactivated.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        onConfirm={() => deactivateOrganizationAction(organizationId)}
      />
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" size="sm">
          Reactivate organization
        </Button>
      }
      title="Reactivate this organization?"
      description={`${organizationName} will regain access.`}
      confirmLabel="Reactivate"
      onConfirm={() => reactivateOrganizationAction(organizationId)}
    />
  );
}
