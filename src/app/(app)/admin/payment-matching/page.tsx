import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listPaymentPeriods } from "@/services/payment-period.service";
import { listFaculties } from "@/services/faculty.service";
import { listDepartments } from "@/services/department.service";
import { listAcademicLevels } from "@/services/academic-level.service";
import { listStudentCategories } from "@/services/student-category.service";
import { MatchingUploadDialog } from "./matching-upload-dialog";

export default async function PaymentMatchingPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }
  const organizationId = session.organizationId;

  const [paymentPeriods, faculties, departments, academicLevels, studentCategories] = await Promise.all([
    listPaymentPeriods(session, organizationId),
    listFaculties(session, organizationId),
    listDepartments(session, organizationId),
    listAcademicLevels(session, organizationId),
    listStudentCategories(session, organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">Payment matching</h1>
          <p className="text-sm text-ink-muted">
            Select a scope, upload the official student list, and reconcile it against payments in
            that scope by index number.
          </p>
        </div>
        <MatchingUploadDialog
          paymentPeriods={paymentPeriods}
          faculties={faculties}
          departments={departments}
          academicLevels={academicLevels}
          studentCategories={studentCategories}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-ink-muted">
        Running a match uploads the list (visible afterward in{" "}
        <Link href="/admin/students" className="text-accent hover:underline">
          Student Lists
        </Link>
        ) and takes you straight to the results — matching percentage, per-status counts, and an
        exportable report.
      </div>
    </div>
  );
}
