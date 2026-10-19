"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";
import type { RevenueDeductionSummary } from "@/services/revenue-allocation.service";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface RevenueDeductionFieldsProps {
  idPrefix: string;
  existing?: RevenueDeductionSummary;
  paymentPeriods: PaymentPeriodSummary[];
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
}

/** Shared field set for the create/edit revenue-deduction dialogs — mirrors revenue-rule-fields.tsx. */
export function RevenueDeductionFields({
  idPrefix,
  existing,
  paymentPeriods,
  faculties,
  departments,
  academicLevels,
  studentCategories,
}: RevenueDeductionFieldsProps) {
  const [facultyId, setFacultyId] = React.useState(existing?.facultyId ?? "");
  const [deductionType, setDeductionType] = React.useState<"FIXED" | "PERCENTAGE">(
    existing?.deductionType ?? "FIXED",
  );

  const visibleDepartments = departments.filter(
    (department) => !facultyId || department.facultyId === facultyId,
  );

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={id("name")}>Name</Label>
        <Input id={id("name")} name="name" required defaultValue={existing?.name ?? ""} />
      </div>

      <p className="text-xs text-ink-muted">
        Leave scope fields blank to apply this deduction to every payment in the organization.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={id("paymentPeriodId")}>Payment period</Label>
          <select
            id={id("paymentPeriodId")}
            name="paymentPeriodId"
            className={selectClassName}
            defaultValue={existing?.paymentPeriodId ?? ""}
          >
            <option value="">All periods</option>
            {paymentPeriods.map((period) => (
              <option key={period.paymentPeriodId} value={period.paymentPeriodId}>
                {period.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("facultyId")}>Faculty</Label>
          <select
            id={id("facultyId")}
            name="facultyId"
            className={selectClassName}
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
          >
            <option value="">All faculties</option>
            {faculties.map((faculty) => (
              <option key={faculty.facultyId} value={faculty.facultyId}>
                {faculty.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("departmentId")}>Department</Label>
          <select
            id={id("departmentId")}
            name="departmentId"
            className={selectClassName}
            defaultValue={existing?.departmentId ?? ""}
          >
            <option value="">All departments</option>
            {visibleDepartments.map((department) => (
              <option key={department.departmentId} value={department.departmentId}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("academicLevelId")}>Academic level</Label>
          <select
            id={id("academicLevelId")}
            name="academicLevelId"
            className={selectClassName}
            defaultValue={existing?.academicLevelId ?? ""}
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
          <Label htmlFor={id("studentCategoryId")}>Student category</Label>
          <select
            id={id("studentCategoryId")}
            name="studentCategoryId"
            className={selectClassName}
            defaultValue={existing?.studentCategoryId ?? ""}
          >
            <option value="">All categories</option>
            {studentCategories.map((category) => (
              <option key={category.studentCategoryId} value={category.studentCategoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="my-1 h-px bg-border" />

      <div className="space-y-1.5">
        <Label htmlFor={id("deductionType")}>Deduction type</Label>
        <select
          id={id("deductionType")}
          name="deductionType"
          className={selectClassName}
          value={deductionType}
          onChange={(e) => setDeductionType(e.target.value as "FIXED" | "PERCENTAGE")}
        >
          <option value="FIXED">Fixed amount</option>
          <option value="PERCENTAGE">Percentage of the payment</option>
        </select>
      </div>

      {deductionType === "FIXED" ? (
        <div className="space-y-1.5">
          <Label htmlFor={id("amount")}>Amount (GHS)</Label>
          <Input
            id={id("amount")}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={
              existing?.amountPesewas != null ? (existing.amountPesewas / 100).toFixed(2) : ""
            }
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={id("percentageBps")}>Percentage (%)</Label>
          <Input
            id={id("percentageBps")}
            name="percentageBps"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            defaultValue={
              existing?.percentageBps != null ? (existing.percentageBps / 100).toFixed(2) : ""
            }
          />
        </div>
      )}
    </>
  );
}
