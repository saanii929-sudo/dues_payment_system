import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { listStudentCategories } from "@/services/student-category.service";
import { StudentCategoriesTable } from "./student-categories-table";
import { StudentCategoryForm } from "./student-category-form";

export default async function StudentCategoriesPage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const categories = await listStudentCategories(session, session.organizationId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Student categories</h1>
        <p className="text-sm text-ink-muted">
          Manage your organization&apos;s student categories.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <StudentCategoriesTable categories={categories} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Add a category</h2>
        <div className="mt-4">
          <StudentCategoryForm />
        </div>
      </div>
    </div>
  );
}
