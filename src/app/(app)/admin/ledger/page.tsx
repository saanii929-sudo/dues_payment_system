import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listLedgerEntries } from "@/services/revenue-allocation.service";
import type { RevenueAllocationStatus } from "@/models";
import { listFaculties } from "@/services/faculty.service";
import { listDepartments } from "@/services/department.service";
import { listAcademicLevels } from "@/services/academic-level.service";
import { listStudentCategories } from "@/services/student-category.service";
import { listPaymentPeriods } from "@/services/payment-period.service";
import { LedgerFilterForm } from "./ledger-filter-form";
import { LedgerTable } from "./ledger-table";
import { Pager } from "../payments/pager";

const PAGE_SIZE = 25;
const VALID_STATUSES: RevenueAllocationStatus[] = ["ALLOCATED", "REVERSED", "ADJUSTED"];

function paramString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function LedgerPage({ searchParams }: PageProps<"/admin/ledger">) {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }
  const organizationId = session.organizationId;

  const sp = await searchParams;
  const page = Math.max(1, Number(paramString(sp.page)) || 1);
  const statusParam = paramString(sp.status);

  const currentFilters = {
    search: paramString(sp.search),
    status: statusParam,
    facultyId: paramString(sp.facultyId),
    departmentId: paramString(sp.departmentId),
    studentCategoryId: paramString(sp.studentCategoryId),
    academicLevelId: paramString(sp.academicLevelId),
    paymentPeriodId: paramString(sp.paymentPeriodId),
  };

  const filters = {
    ...currentFilters,
    status:
      statusParam && (VALID_STATUSES as string[]).includes(statusParam)
        ? (statusParam as RevenueAllocationStatus)
        : undefined,
  };

  const [result, faculties, departments, academicLevels, studentCategories, paymentPeriods] =
    await Promise.all([
      listLedgerEntries(session, organizationId, filters, { page, pageSize: PAGE_SIZE }),
      listFaculties(session, organizationId),
      listDepartments(session, organizationId),
      listAcademicLevels(session, organizationId),
      listStudentCategories(session, organizationId),
      listPaymentPeriods(session, organizationId),
    ]);

  const totalPages = Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Financial ledger</h1>
        <p className="text-sm text-ink-muted">
          {result.totalCount} allocation{result.totalCount === 1 ? "" : "s"} — every successful
          payment&apos;s Faculty/Department split, traceable back to the payment that produced it.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <LedgerFilterForm
          current={currentFilters}
          faculties={faculties.filter((faculty) => faculty.isActive)}
          departments={departments.filter((department) => department.isActive)}
          academicLevels={academicLevels.filter((level) => level.isActive)}
          studentCategories={studentCategories.filter((category) => category.isActive)}
          paymentPeriods={paymentPeriods}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <LedgerTable entries={result.entries} />
        <Pager page={page} totalPages={totalPages} searchParams={currentFilters} basePath="/admin/ledger" />
      </div>
    </div>
  );
}
