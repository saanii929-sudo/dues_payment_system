import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listRevenueRules } from "@/services/revenue-rule.service";
import { listPaymentPeriods } from "@/services/payment-period.service";
import { listFaculties } from "@/services/faculty.service";
import { listDepartments } from "@/services/department.service";
import { listAcademicLevels } from "@/services/academic-level.service";
import { listStudentCategories } from "@/services/student-category.service";
import { Button } from "@/components/ui/button";
import { RevenueRuleDialog } from "./revenue-rule-dialog";
import { RevenueRulesTable } from "./revenue-rules-table";

export default async function RevenueRulesPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organizationId = session.organizationId;
  const [rules, paymentPeriods, faculties, departments, academicLevels, studentCategories] =
    await Promise.all([
      listRevenueRules(session, organizationId),
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
          <h1 className="text-xl font-semibold text-ink">Revenue rules</h1>
          <p className="text-sm text-ink-muted">
            Set the Faculty share for each scope — fixed amount or percentage. Department
            automatically receives whatever remains after the Faculty share and any approved
            deductions.
          </p>
        </div>
        <RevenueRuleDialog
          trigger={<Button size="sm">New rule</Button>}
          paymentPeriods={activePaymentPeriods}
          faculties={activeFaculties}
          departments={activeDepartments}
          academicLevels={activeAcademicLevels}
          studentCategories={activeStudentCategories}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <RevenueRulesTable
          rules={rules}
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
