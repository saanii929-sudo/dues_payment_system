import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getDepartmentDetails } from "@/services/department.service";
import { listFaculties } from "@/services/faculty.service";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EditDepartmentForm } from "./edit-department-form";
import { DepartmentActions } from "./department-actions";

export default async function DepartmentDetailsPage({
  params,
}: PageProps<"/admin/departments/[departmentId]">) {
  const { departmentId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const [department, faculties] = await Promise.all([
    getDepartmentDetails(session, session.organizationId, departmentId),
    listFaculties(session, session.organizationId),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{department.name}</h1>
          <p className="text-sm text-ink-muted">
            {department.code} · {department.facultyName}
          </p>
        </div>
        <Badge variant={department.isActive ? "success" : "danger"}>
          {department.isActive ? "Active" : "Deactivated"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Students</p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{department.studentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Head of Department
          </p>
          <p className="mt-1.5 text-lg font-semibold text-ink">
            {department.hod ? department.hod.fullName : "Not assigned"}
          </p>
          {department.hod && (
            <p className="text-xs text-ink-muted">{department.hod.email}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Executives</h2>
        <div className="mt-3">
          {department.executives.length === 0 ? (
            <p className="text-sm text-ink-muted">No executives assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {department.executives.map((executive) => (
                  <TableRow key={executive.userRoleId}>
                    <TableCell className="text-ink-muted">{executive.role}</TableCell>
                    <TableCell className="font-medium text-ink">{executive.fullName}</TableCell>
                    <TableCell className="text-ink-muted">{executive.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Edit department</h2>
        <div className="mt-4">
          <EditDepartmentForm
            department={department}
            faculties={faculties.filter((faculty) => faculty.isActive)}
          />
        </div>
      </div>

      <DepartmentActions
        departmentId={department.departmentId}
        isActive={department.isActive}
        departmentName={department.name}
      />
    </div>
  );
}
