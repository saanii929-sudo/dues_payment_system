import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listRevenueDeductions } from "@/services/revenue-allocation.service";
import { listPaymentPeriods } from "@/services/payment-period.service";
import { listFaculties } from "@/services/faculty.service";
import { listDepartments } from "@/services/department.service";
import { listAcademicLevels } from "@/services/academic-level.service";
import { listStudentCategories } from "@/services/student-category.service";
import { Button } from "@/components/ui/button";
import { RevenueDeductionDialog } from "./revenue-deduction-dialog";
import { RevenueDeductionsTable } from "./revenue-deductions-table";

export default async function RevenueDeductionsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organizationId = session.organizationId;
  const [deductions, paymentPeriods, faculties, departments, academicLevels, studentCategories] =
    await Promise.all([
      listRevenueDeductions(session, organizationId),
      listPaymentPeriods(session, organizationId),
      listFaculties(session, organizationId),
      listDepartments(session, organizationId),
      listAcademicLevels(session, organizationId),
      listStudentCategories(session, organizationId),
    ]);

  const activePaymentPeriods = paymentPeriods.filter((period) => period.status !== "ARCHIVED");
  const activeFaculties = faculties.filter((faculty) => faculty.isActive);
  const activeDepartments = departments.filter((department) => department.isActive);
  const activeAcademicLevels = academicLevels.filter((level) => level.isActive);
  const activeStudentCategories = studentCategories.filter((category) => category.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">Revenue deductions</h1>
          <p className="text-sm text-ink-muted">
            Fees taken off the top before Department receives its remainder. A deduction affects
            nothing until explicitly approved — every Approved deduction whose scope matches a
            payment is applied.
          </p>
        </div>
        <RevenueDeductionDialog
          trigger={<Button size="sm">New deduction</Button>}
          paymentPeriods={activePaymentPeriods}
          faculties={activeFaculties}
          departments={activeDepartments}
          academicLevels={activeAcademicLevels}
          studentCategories={activeStudentCategories}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <RevenueDeductionsTable
          deductions={deductions}
          paymentPeriods={activePaymentPeriods}
          faculties={activeFaculties}
          departments={activeDepartments}
          academicLevels={activeAcademicLevels}
          studentCategories={activeStudentCategories}
        />
      </div>
    </div>
  );
}
