"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { RevenueRuleFields } from "./revenue-rule-fields";
import { createRevenueRuleAction, updateRevenueRuleAction } from "./actions";
import type { RevenueRuleSummary } from "@/services/revenue-rule.service";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";

export interface RevenueRuleDialogProps {
  trigger: React.ReactNode;
  existing?: RevenueRuleSummary;
  paymentPeriods: PaymentPeriodSummary[];
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
}

export function RevenueRuleDialog({
  trigger,
  existing,
  paymentPeriods,
  faculties,
  departments,
  academicLevels,
  studentCategories,
}: RevenueRuleDialogProps) {
  const isEdit = Boolean(existing);
  const idPrefix = existing ? `rr-edit-${existing.ruleId}` : "rr-new";

  return (
    <EditDialog
      trigger={trigger}
      title={isEdit ? "Edit revenue rule" : "New revenue rule"}
      submitLabel={isEdit ? "Save changes" : "Create rule"}
      size="lg"
      onSubmit={(formData) =>
        isEdit && existing
          ? updateRevenueRuleAction(existing.ruleId, formData)
          : createRevenueRuleAction(formData)
      }
    >
      <RevenueRuleFields
        idPrefix={idPrefix}
        existing={existing}
        paymentPeriods={paymentPeriods}
        faculties={faculties}
        departments={departments}
        academicLevels={academicLevels}
        studentCategories={studentCategories}
      />
    </EditDialog>
  );
}
