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
import { RevenueRuleDialog } from "./revenue-rule-dialog";
import { deactivateRevenueRuleAction, reactivateRevenueRuleAction } from "./actions";
import type { RevenueRuleSummary } from "@/services/revenue-rule.service";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";

export interface RevenueRulesTableProps {
  rules: RevenueRuleSummary[];
  paymentPeriods: PaymentPeriodSummary[];
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
}

function scopeSummary(rule: RevenueRuleSummary): string {
  const parts = [
    rule.paymentPeriodName,
    rule.facultyName,
    rule.departmentName,
    rule.academicLevelName,
    rule.studentCategoryName,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Organization-wide";
}

export function RevenueRulesTable({
  rules,
  paymentPeriods,
  faculties,
  departments,
  academicLevels,
  studentCategories,
}: RevenueRulesTableProps) {
  if (rules.length === 0) {
    return <p className="text-sm text-ink-muted">No revenue rules yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Faculty share</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.ruleId}>
            <TableCell className="font-medium text-ink">{rule.name}</TableCell>
            <TableCell className="text-ink-muted">{scopeSummary(rule)}</TableCell>
            <TableCell className="text-ink-muted">
              {rule.facultyShareType === "FIXED" ? (
                <Money amountPesewas={rule.facultyShareAmountPesewas ?? 0} />
              ) : (
                `${((rule.facultyShareBps ?? 0) / 100).toFixed(2)}%`
              )}
            </TableCell>
            <TableCell className="text-ink-muted">{rule.priority}</TableCell>
            <TableCell>
              <Badge variant={rule.isActive ? "success" : "danger"}>
                {rule.isActive ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              <RevenueRuleDialog
                trigger={
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
                }
                existing={rule}
                paymentPeriods={paymentPeriods}
                faculties={faculties}
                departments={departments}
                academicLevels={academicLevels}
                studentCategories={studentCategories}
              />
              {rule.isActive ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      Deactivate
                    </Button>
                  }
                  title="Deactivate this revenue rule?"
                  description={`${rule.name} will stop applying to new payments.`}
                  confirmLabel="Deactivate"
                  confirmVariant="danger"
                  onConfirm={() => deactivateRevenueRuleAction(rule.ruleId)}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Reactivate
                    </Button>
                  }
                  title="Reactivate this revenue rule?"
                  description={`${rule.name} will apply to new payments again.`}
                  confirmLabel="Reactivate"
                  onConfirm={() => reactivateRevenueRuleAction(rule.ruleId)}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
