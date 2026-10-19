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
import { DuesConfigurationModal } from "./dues-configuration-modal";
import { transitionDuesConfigurationStatusAction } from "./actions";
import type { DuesConfigurationSummary } from "@/services/dues-configuration.service";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";

// Local status→badge map — this is a Client Component, so it must never
// import a runtime value from dues-configuration.service.ts, which pulls in
// the server-only DB/auth guard (see Phase 8's status-badge.tsx precedent).
const STATUS_VARIANT = {
  DRAFT: "neutral",
  ACTIVE: "success",
  ARCHIVED: "danger",
} as const;

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString();
}

export function DuesConfigurationsTable({
  configurations,
  paymentPeriods,
  faculties,
  departments,
  academicLevels,
  studentCategories,
}: {
  configurations: DuesConfigurationSummary[];
  paymentPeriods: PaymentPeriodSummary[];
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
}) {
  if (configurations.length === 0) {
    return <p className="text-sm text-ink-muted">No dues configurations match your filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Payment period</TableHead>
            <TableHead>Faculty</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Effective date</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configurations.map((configuration) => (
            <TableRow key={configuration.duesConfigurationId}>
              <TableCell className="font-medium text-ink">
                {configuration.name}
                {configuration.isMandatory && (
                  <Badge variant="info" className="ml-2">
                    Mandatory
                  </Badge>
                )}
                <div className="text-xs text-ink-muted">{configuration.code}</div>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[configuration.status]}>
                  {configuration.status.charAt(0) + configuration.status.slice(1).toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-ink-muted">
                {configuration.studentCategoryName ?? "All"}
              </TableCell>
              <TableCell className="text-ink-muted">
                {configuration.academicLevelName ?? "All"}
              </TableCell>
              <TableCell className="text-ink-muted">{configuration.paymentPeriodName}</TableCell>
              <TableCell className="text-ink-muted">
                {configuration.facultyName ?? "All"}
              </TableCell>
              <TableCell className="text-ink-muted">
                {configuration.departmentName ?? "All"}
              </TableCell>
              <TableCell className="text-right">
                <Money amountPesewas={configuration.amountPesewas} />
              </TableCell>
              <TableCell className="text-ink-muted">
                {formatDate(configuration.effectiveDate)}
              </TableCell>
              <TableCell className="text-ink-muted">
                {configuration.createdByName ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1.5">
                  {configuration.status !== "ARCHIVED" && (
                    <DuesConfigurationModal
                      trigger={
                        <Button variant="secondary" size="sm">
                          Edit
                        </Button>
                      }
                      existing={configuration}
                      paymentPeriods={paymentPeriods}
                      faculties={faculties}
                      departments={departments}
                      academicLevels={academicLevels}
                      studentCategories={studentCategories}
                    />
                  )}
                  {configuration.status === "DRAFT" && (
                    <ConfirmDialog
                      trigger={
                        <Button variant="primary" size="sm">
                          Activate
                        </Button>
                      }
                      title="Activate this configuration?"
                      description="It becomes Active and will apply to matching students immediately."
                      confirmLabel="Activate"
                      onConfirm={() =>
                        transitionDuesConfigurationStatusAction(
                          configuration.duesConfigurationId,
                          "ACTIVE",
                        )
                      }
                    />
                  )}
                  {configuration.status !== "ARCHIVED" && (
                    <ConfirmDialog
                      trigger={
                        <Button variant="danger" size="sm">
                          Archive
                        </Button>
                      }
                      title="Archive this configuration?"
                      description={`${configuration.name} becomes historical record and can no longer be edited or reactivated.`}
                      confirmLabel="Archive"
                      confirmVariant="danger"
                      onConfirm={() =>
                        transitionDuesConfigurationStatusAction(
                          configuration.duesConfigurationId,
                          "ARCHIVED",
                        )
                      }
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
