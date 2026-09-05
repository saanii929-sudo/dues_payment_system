"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/finance/money";
import {
  deactivateDuesConfigurationAction,
  reactivateDuesConfigurationAction,
} from "./actions";
import type { DuesConfigurationSummary } from "@/services/dues-configuration.service";

export function DuesConfigurationsTable({
  configurations,
}: {
  configurations: DuesConfigurationSummary[];
}) {
  if (configurations.length === 0) {
    return <p className="text-sm text-ink-muted">No dues configurations yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {configurations.map((configuration) => {
          const scopeParts = [
            configuration.facultyName,
            configuration.departmentName,
            configuration.academicLevelName,
            configuration.studentCategoryName,
          ].filter(Boolean);

          return (
            <TableRow key={configuration.duesConfigurationId}>
              <TableCell className="font-medium text-ink">
                {configuration.name}
                {configuration.isMandatory && (
                  <Badge variant="info" className="ml-2">
                    Mandatory
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-ink-muted">{configuration.paymentPeriodName}</TableCell>
              <TableCell className="text-ink-muted">
                {scopeParts.length > 0 ? scopeParts.join(" · ") : "All students"}
              </TableCell>
              <TableCell className="text-right">
                <Money amountPesewas={configuration.amountPesewas} />
              </TableCell>
              <TableCell>
                <Badge variant={configuration.isActive ? "success" : "danger"}>
                  {configuration.isActive ? "Active" : "Deactivated"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {configuration.isActive ? (
                  <ConfirmDialog
                    trigger={
                      <Button variant="danger" size="sm">
                        Deactivate
                      </Button>
                    }
                    title="Deactivate this dues configuration?"
                    description={`${configuration.name} will no longer apply to new payments.`}
                    confirmLabel="Deactivate"
                    confirmVariant="danger"
                    onConfirm={() =>
                      deactivateDuesConfigurationAction(configuration.duesConfigurationId)
                    }
                  />
                ) : (
                  <ConfirmDialog
                    trigger={
                      <Button variant="secondary" size="sm">
                        Reactivate
                      </Button>
                    }
                    title="Reactivate this dues configuration?"
                    description={`${configuration.name} will apply to new payments again.`}
                    confirmLabel="Reactivate"
                    onConfirm={() =>
                      reactivateDuesConfigurationAction(configuration.duesConfigurationId)
                    }
                  />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
