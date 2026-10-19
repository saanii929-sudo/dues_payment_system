import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const STATUS_OPTIONS = [
  { value: "ALLOCATED", label: "Allocated" },
  { value: "REVERSED", label: "Reversed" },
  { value: "ADJUSTED", label: "Adjusted" },
];

export interface LedgerCurrentFilters {
  search?: string;
  status?: string;
  facultyId?: string;
  departmentId?: string;
  studentCategoryId?: string;
  academicLevelId?: string;
  paymentPeriodId?: string;
}

/** A plain GET `<form>` — mirrors `payments-filter-form.tsx`'s server-driven pattern exactly. */
export function LedgerFilterForm({
  current,
  faculties,
  departments,
  academicLevels,
  studentCategories,
  paymentPeriods,
}: {
  current: LedgerCurrentFilters;
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
  paymentPeriods: PaymentPeriodSummary[];
}) {
  const hasFilters = Object.values(current).some(Boolean);

  return (
    <form method="get" className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            name="search"
            defaultValue={current.search ?? ""}
            placeholder="Student index number"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue={current.status ?? ""} className={selectClassName}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paymentPeriodId">Payment period</Label>
          <select
            id="paymentPeriodId"
            name="paymentPeriodId"
            defaultValue={current.paymentPeriodId ?? ""}
            className={selectClassName}
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
          <Label htmlFor="facultyId">Faculty</Label>
          <select
            id="facultyId"
            name="facultyId"
            defaultValue={current.facultyId ?? ""}
            className={selectClassName}
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
          <Label htmlFor="departmentId">Department</Label>
          <select
            id="departmentId"
            name="departmentId"
            defaultValue={current.departmentId ?? ""}
            className={selectClassName}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.departmentId} value={department.departmentId}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="academicLevelId">Academic level</Label>
          <select
            id="academicLevelId"
            name="academicLevelId"
            defaultValue={current.academicLevelId ?? ""}
            className={selectClassName}
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
          <Label htmlFor="studentCategoryId">Student category</Label>
          <select
            id="studentCategoryId"
            name="studentCategoryId"
            defaultValue={current.studentCategoryId ?? ""}
            className={selectClassName}
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
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        {hasFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/ledger">Clear filters</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
