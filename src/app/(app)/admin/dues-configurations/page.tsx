import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listDuesConfigurations } from "@/services/dues-configuration.service";
import { listPaymentPeriods } from "@/services/payment-period.service";
import { listFaculties } from "@/services/faculty.service";
import { listDepartments } from "@/services/department.service";
import { listAcademicLevels } from "@/services/academic-level.service";
import { listStudentCategories } from "@/services/student-category.service";
import { DuesConfigurationsTable } from "./dues-configurations-table";
import { DuesConfigurationForm } from "./dues-configuration-form";

export default async function DuesConfigurationsPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organizationId = session.organizationId;
  const [configurations, paymentPeriods, faculties, departments, academicLevels, studentCategories] =
    await Promise.all([
      listDuesConfigurations(session, organizationId),
      listPaymentPeriods(session, organizationId),
      listFaculties(session, organizationId),
      listDepartments(session, organizationId),
      listAcademicLevels(session, organizationId),
      listStudentCategories(session, organizationId),
    ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Dues configuration</h1>
        <p className="text-sm text-ink-muted">
          Define what students owe, and for which period and scope.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <DuesConfigurationsTable configurations={configurations} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Add a dues configuration</h2>
        <div className="mt-4">
          <DuesConfigurationForm
            paymentPeriods={paymentPeriods.filter((period) => period.isActive)}
            faculties={faculties.filter((faculty) => faculty.isActive)}
            departments={departments.filter((department) => department.isActive)}
            academicLevels={academicLevels.filter((level) => level.isActive)}
            studentCategories={studentCategories.filter((category) => category.isActive)}
          />
        </div>
      </div>
    </div>
  );
}
