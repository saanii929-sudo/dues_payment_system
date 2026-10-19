import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FacultyDashboardFilterOptions } from "@/services/dashboard.service";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface FacultyDashboardCurrentFilters {
  studentCategoryId?: string;
  academicLevelId?: string;
  paymentPeriodId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * A plain GET `<form>` — mirrors `payments-filter-form.tsx`'s server-driven
 * pattern. Only affects the Collection metrics group; Available balance and
 * the withdrawal metrics are wallet-level and always show the current state.
 */
export function FacultyDashboardFilterForm({
  facultyId,
  current,
  options,
}: {
  facultyId: string;
  current: FacultyDashboardCurrentFilters;
  options: FacultyDashboardFilterOptions;
}) {
  const { departments, academicLevels, studentCategories, paymentPeriods } = options;
  const hasFilters = Object.values(current).some(Boolean);

  return (
    <form method="get" className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="studentCategoryId">Category</Label>
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
        <div className="space-y-1.5">
          <Label htmlFor="academicLevelId">Level</Label>
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
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="dateFrom">From</Label>
            <Input id="dateFrom" name="dateFrom" type="date" defaultValue={current.dateFrom ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateTo">To</Label>
            <Input id="dateTo" name="dateTo" type="date" defaultValue={current.dateTo ?? ""} />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        {hasFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/faculty/${facultyId}`}>Clear filters</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
