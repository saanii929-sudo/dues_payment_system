"use client";

import { useActionState } from "react";
import {
  createDuesConfigurationAction,
  type CreateDuesConfigurationFormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";

const initialState: CreateDuesConfigurationFormState = {};

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function DuesConfigurationForm({
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
  const [state, action, pending] = useActionState(createDuesConfigurationAction, initialState);

  if (paymentPeriods.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Add a payment period first — every dues configuration belongs to one.
      </p>
    );
  }

  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="e.g. Departmental Dues" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" required placeholder="e.g. DEPT-DUES" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="paymentPeriodId">Payment period</Label>
        <select id="paymentPeriodId" name="paymentPeriodId" required className={selectClassName}>
          {paymentPeriods.map((period) => (
            <option key={period.paymentPeriodId} value={period.paymentPeriodId}>
              {period.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (GHS)</Label>
        <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="facultyId">Faculty (optional)</Label>
        <select id="facultyId" name="facultyId" className={selectClassName} defaultValue="">
          <option value="">All faculties</option>
          {faculties.map((faculty) => (
            <option key={faculty.facultyId} value={faculty.facultyId}>
              {faculty.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="departmentId">Department (optional)</Label>
        <select id="departmentId" name="departmentId" className={selectClassName} defaultValue="">
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.departmentId} value={department.departmentId}>
              {department.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="academicLevelId">Academic level (optional)</Label>
        <select
          id="academicLevelId"
          name="academicLevelId"
          className={selectClassName}
          defaultValue=""
        >
          <option value="">All levels</option>
          {academicLevels.map((level) => (
            <option key={level.academicLevelId} value={level.academicLevelId}>
              {level.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="studentCategoryId">Student category (optional)</Label>
        <select
          id="studentCategoryId"
          name="studentCategoryId"
          className={selectClassName}
          defaultValue=""
        >
          <option value="">All categories</option>
          {studentCategories.map((category) => (
            <option key={category.studentCategoryId} value={category.studentCategoryId}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          id="isMandatory"
          name="isMandatory"
          defaultChecked
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="isMandatory">Mandatory</Label>
      </div>
      {state?.error && (
        <p className="sm:col-span-2 rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add dues configuration"}
        </Button>
      </div>
    </form>
  );
}
