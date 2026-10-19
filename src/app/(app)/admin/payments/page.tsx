import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listPayments } from "@/services/payment.service";
import type { PaymentStatus } from "@/models";
import { listFaculties } from "@/services/faculty.service";
import { listDepartments } from "@/services/department.service";
import { listAcademicLevels } from "@/services/academic-level.service";
import { listStudentCategories } from "@/services/student-category.service";
import { listPaymentPeriods } from "@/services/payment-period.service";
import { PaymentsFilterForm } from "./payments-filter-form";
import { PaymentsTable } from "./payments-table";
import { Pager } from "./pager";

const PAGE_SIZE = 25;
const VALID_STATUSES: PaymentStatus[] = ["PENDING", "SUCCESSFUL", "FAILED", "CANCELLED", "REFUNDED"];

function paramString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
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
    dateFrom: paramString(sp.dateFrom),
    dateTo: paramString(sp.dateTo),
  };

  const filters = {
    ...currentFilters,
    status:
      statusParam && (VALID_STATUSES as string[]).includes(statusParam)
        ? (statusParam as PaymentStatus)
        : undefined,
  };

  const [result, faculties, departments, academicLevels, studentCategories, paymentPeriods] =
    await Promise.all([
      listPayments(session, organizationId, filters, { page, pageSize: PAGE_SIZE }),
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
        <h1 className="text-xl font-semibold text-ink">Payment records</h1>
        <p className="text-sm text-ink-muted">
          {result.totalCount} payment{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <PaymentsFilterForm
          current={currentFilters}
          faculties={faculties.filter((faculty) => faculty.isActive)}
          departments={departments.filter((department) => department.isActive)}
          academicLevels={academicLevels.filter((level) => level.isActive)}
          studentCategories={studentCategories.filter((category) => category.isActive)}
          paymentPeriods={paymentPeriods}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <PaymentsTable payments={result.payments} />
        <Pager
          page={page}
          totalPages={totalPages}
          searchParams={currentFilters}
          basePath="/admin/payments"
        />
      </div>
    </div>
  );
}
