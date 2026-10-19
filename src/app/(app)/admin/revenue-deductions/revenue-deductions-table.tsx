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
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Money } from "@/components/finance/money";
import { RevenueDeductionDialog } from "./revenue-deduction-dialog";
import { transitionRevenueDeductionStatusAction } from "./actions";
import type {
  RevenueDeductionSummary,
} from "@/services/revenue-allocation.service";
import type { RevenueDeductionStatus } from "@/models";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";

export interface RevenueDeductionsTableProps {
  deductions: RevenueDeductionSummary[];
  paymentPeriods: PaymentPeriodSummary[];
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
}

const STATUS_BADGE: Record<RevenueDeductionStatus, "neutral" | "success" | "danger"> = {
  DRAFT: "neutral",
  APPROVED: "success",
  ARCHIVED: "danger",
};

function scopeSummary(deduction: RevenueDeductionSummary, paymentPeriods: PaymentPeriodSummary[], faculties: FacultySummary[], departments: DepartmentSummary[], academicLevels: AcademicLevelSummary[], studentCategories: StudentCategorySummary[]): string {
  const parts = [
    paymentPeriods.find((p) => p.paymentPeriodId === deduction.paymentPeriodId)?.name,
    faculties.find((f) => f.facultyId === deduction.facultyId)?.name,
    departments.find((d) => d.departmentId === deduction.departmentId)?.name,
    academicLevels.find((l) => l.academicLevelId === deduction.academicLevelId)?.name,
    studentCategories.find((c) => c.studentCategoryId === deduction.studentCategoryId)?.name,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Organization-wide";
}

export function RevenueDeductionsTable({
  deductions,
  paymentPeriods,
  faculties,
  departments,
  academicLevels,
  studentCategories,
}: RevenueDeductionsTableProps) {
  if (deductions.length === 0) {
    return <p className="text-sm text-ink-muted">No deductions yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deductions.map((deduction) => (
          <TableRow key={deduction.deductionId}>
            <TableCell className="font-medium text-ink">{deduction.name}</TableCell>
            <TableCell className="text-ink-muted">
              {scopeSummary(
                deduction,
                paymentPeriods,
                faculties,
                departments,
                academicLevels,
                studentCategories,
              )}
            </TableCell>
            <TableCell className="text-ink-muted">
              {deduction.deductionType === "FIXED" ? "Fixed" : "Percentage"}
            </TableCell>
            <TableCell className="text-ink-muted">
              {deduction.deductionType === "FIXED" ? (
                <Money amountPesewas={deduction.amountPesewas ?? 0} />
              ) : (
                `${((deduction.percentageBps ?? 0) / 100).toFixed(2)}%`
              )}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_BADGE[deduction.status]}>{deduction.status}</Badge>
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              {deduction.status !== "ARCHIVED" && (
                <RevenueDeductionDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Edit
                    </Button>
                  }
                  existing={deduction}
                  paymentPeriods={paymentPeriods}
                  faculties={faculties}
                  departments={departments}
                  academicLevels={academicLevels}
                  studentCategories={studentCategories}
                />
              )}
              {deduction.status === "DRAFT" && (
                <ConfirmDialog
                  trigger={
                    <Button variant="primary" size="sm">
                      Approve
                    </Button>
                  }
                  title="Approve this deduction?"
                  description={`${deduction.name} will start applying to matching payments.`}
                  confirmLabel="Approve"
                  onConfirm={() =>
                    transitionRevenueDeductionStatusAction(deduction.deductionId, "APPROVED")
                  }
                />
              )}
              {deduction.status !== "ARCHIVED" && (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      Archive
                    </Button>
                  }
                  title="Archive this deduction?"
                  description={`${deduction.name} will stop applying and can no longer be edited.`}
                  confirmLabel="Archive"
                  confirmVariant="danger"
                  onConfirm={() =>
                    transitionRevenueDeductionStatusAction(deduction.deductionId, "ARCHIVED")
                  }
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
