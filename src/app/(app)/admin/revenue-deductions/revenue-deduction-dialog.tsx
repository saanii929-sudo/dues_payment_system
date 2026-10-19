"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { RevenueDeductionFields } from "./revenue-deduction-fields";
import { createRevenueDeductionAction, updateRevenueDeductionAction } from "./actions";
import type { RevenueDeductionSummary } from "@/services/revenue-allocation.service";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";

export interface RevenueDeductionDialogProps {
  trigger: React.ReactNode;
  existing?: RevenueDeductionSummary;
  paymentPeriods: PaymentPeriodSummary[];
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
}

export function RevenueDeductionDialog({
  trigger,
  existing,
  paymentPeriods,
  faculties,
  departments,
  academicLevels,
  studentCategories,
}: RevenueDeductionDialogProps) {
  const isEdit = Boolean(existing);
  const idPrefix = existing ? `rd-edit-${existing.deductionId}` : "rd-new";

  return (
    <EditDialog
      trigger={trigger}
      title={isEdit ? "Edit deduction" : "New deduction"}
      submitLabel={isEdit ? "Save changes" : "Create deduction"}
      size="lg"
      onSubmit={(formData) =>
        isEdit && existing
          ? updateRevenueDeductionAction(existing.deductionId, formData)
          : createRevenueDeductionAction(formData)
      }
    >
      <RevenueDeductionFields
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
