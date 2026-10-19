"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DuesConfigurationsTable } from "./dues-configurations-table";
import { DuesConfigurationModal } from "./dues-configuration-modal";
import type { DuesConfigurationSummary } from "@/services/dues-configuration.service";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";

const selectClassName =
  "flex h-9 rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
const STATUS_LABELS: Record<(typeof STATUS_OPTIONS)[number], string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export function DuesConfigurationsToolbar({
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
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [studentCategoryId, setStudentCategoryId] = React.useState("");
  const [academicLevelId, setAcademicLevelId] = React.useState("");
  const [paymentPeriodId, setPaymentPeriodId] = React.useState("");
  const [facultyId, setFacultyId] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");

  const filtered = configurations.filter((configuration) => {
    if (status && configuration.status !== status) return false;
    if (studentCategoryId && configuration.studentCategoryId !== studentCategoryId) return false;
    if (academicLevelId && configuration.academicLevelId !== academicLevelId) return false;
    if (paymentPeriodId && configuration.paymentPeriodId !== paymentPeriodId) return false;
    if (facultyId && configuration.facultyId !== facultyId) return false;
    if (departmentId && configuration.departmentId !== departmentId) return false;
    if (search) {
      const haystack = `${configuration.name} ${configuration.code}`.toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  const hasActiveFilters = Boolean(
    search || status || studentCategoryId || academicLevelId || paymentPeriodId || facultyId || departmentId,
  );

  function clearFilters() {
    setSearch("");
    setStatus("");
    setStudentCategoryId("");
    setAcademicLevelId("");
    setPaymentPeriodId("");
    setFacultyId("");
    setDepartmentId("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClassName}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABELS[option]}
              </option>
            ))}
          </select>
          <select
            value={paymentPeriodId}
            onChange={(e) => setPaymentPeriodId(e.target.value)}
            className={selectClassName}
          >
            <option value="">All periods</option>
            {paymentPeriods.map((period) => (
              <option key={period.paymentPeriodId} value={period.paymentPeriodId}>
                {period.name}
              </option>
            ))}
          </select>
          <select
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            className={selectClassName}
          >
            <option value="">All faculties</option>
            {faculties.map((faculty) => (
              <option key={faculty.facultyId} value={faculty.facultyId}>
                {faculty.name}
              </option>
            ))}
          </select>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className={selectClassName}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.departmentId} value={department.departmentId}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            value={academicLevelId}
            onChange={(e) => setAcademicLevelId(e.target.value)}
            className={selectClassName}
          >
            <option value="">All levels</option>
            {academicLevels.map((level) => (
              <option key={level.academicLevelId} value={level.academicLevelId}>
                {level.name}
              </option>
            ))}
          </select>
          <select
            value={studentCategoryId}
            onChange={(e) => setStudentCategoryId(e.target.value)}
            className={selectClassName}
          >
            <option value="">All categories</option>
            {studentCategories.map((category) => (
              <option key={category.studentCategoryId} value={category.studentCategoryId}>
                {category.name}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <DuesConfigurationModal
          trigger={<Button size="sm">New configuration</Button>}
          paymentPeriods={paymentPeriods}
          faculties={faculties}
          departments={departments}
          academicLevels={academicLevels}
          studentCategories={studentCategories}
        />
      </div>

      <p className="text-xs text-ink-muted">
        {filtered.length} of {configurations.length} configuration
        {configurations.length === 1 ? "" : "s"}
      </p>

      <DuesConfigurationsTable
        configurations={filtered}
        paymentPeriods={paymentPeriods}
        faculties={faculties}
        departments={departments}
        academicLevels={academicLevels}
        studentCategories={studentCategories}
      />
    </div>
  );
}
