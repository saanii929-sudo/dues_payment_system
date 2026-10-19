"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";
import { runMatchingAction } from "./actions";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function MatchingUploadDialog({
  paymentPeriods,
  faculties,
  departments,
  academicLevels,
  studentCategories,
}: {
  paymentPeriods: PaymentPeriodSummary[];
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
}) {
  return (
    <EditDialog
      trigger={<Button size="sm">Run payment matching</Button>}
      title="Match student list against payments"
      description="Select the scope, then upload the official student list (.csv, .xlsx, .xls, up to 5MB) to reconcile it against payments in that scope by index number."
      submitLabel="Upload & match"
      size="lg"
      onSubmit={runMatchingAction}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="mm-paymentPeriodId">Payment period</Label>
          <select id="mm-paymentPeriodId" name="paymentPeriodId" required className={selectClassName} defaultValue="">
            <option value="" disabled>
              Select a payment period
            </option>
            {paymentPeriods.map((period) => (
              <option key={period.paymentPeriodId} value={period.paymentPeriodId}>
                {period.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mm-facultyId">Faculty (optional)</Label>
          <select id="mm-facultyId" name="facultyId" className={selectClassName} defaultValue="">
            <option value="">All faculties</option>
            {faculties.map((faculty) => (
              <option key={faculty.facultyId} value={faculty.facultyId}>
                {faculty.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mm-departmentId">Department (optional)</Label>
          <select id="mm-departmentId" name="departmentId" className={selectClassName} defaultValue="">
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.departmentId} value={department.departmentId}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mm-academicLevelId">Academic level (optional)</Label>
          <select id="mm-academicLevelId" name="academicLevelId" className={selectClassName} defaultValue="">
            <option value="">All levels</option>
            {academicLevels.map((level) => (
              <option key={level.academicLevelId} value={level.academicLevelId}>
                {level.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mm-studentCategoryId">Student category (optional)</Label>
          <select id="mm-studentCategoryId" name="studentCategoryId" className={selectClassName} defaultValue="">
            <option value="">All categories</option>
            {studentCategories.map((category) => (
              <option key={category.studentCategoryId} value={category.studentCategoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mm-file">Student list file</Label>
        <Input id="mm-file" name="file" type="file" accept=".csv,.xlsx,.xls" required />
      </div>
    </EditDialog>
  );
}
