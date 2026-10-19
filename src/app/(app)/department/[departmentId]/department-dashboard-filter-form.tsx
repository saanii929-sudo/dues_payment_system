import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DepartmentDashboardFilterOptions } from "@/services/dashboard.service";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface DepartmentDashboardCurrentFilters {
  studentCategoryId?: string;
  academicLevelId?: string;
  paymentPeriodId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Mirrors `faculty-dashboard-filter-form.tsx` minus the Department select —
 * a department has no sub-departments to filter by. Only affects the
 * Collection metrics group; Available balance and the withdrawal metrics
 * are wallet-level and always show the current state.
 */
export function DepartmentDashboardFilterForm({
  departmentId,
  current,
  options,
}: {
  departmentId: string;
  current: DepartmentDashboardCurrentFilters;
  options: DepartmentDashboardFilterOptions;
}) {
  const { academicLevels, studentCategories, paymentPeriods } = options;
  const hasFilters = Object.values(current).some(Boolean);

  return (
    <form method="get" className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <Link href={`/department/${departmentId}`}>Clear filters</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
