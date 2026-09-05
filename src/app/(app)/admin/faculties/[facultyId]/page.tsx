import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getFacultyDetails } from "@/services/faculty.service";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EditFacultyForm } from "./edit-faculty-form";
import { FacultyActions } from "./faculty-actions";

export default async function FacultyDetailsPage({
  params,
}: PageProps<"/admin/faculties/[facultyId]">) {
  const { facultyId } = await params;
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const faculty = await getFacultyDetails(session, session.organizationId, facultyId);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">{faculty.name}</h1>
          <p className="text-sm text-ink-muted">{faculty.code}</p>
        </div>
        <Badge variant={faculty.isActive ? "success" : "danger"}>
          {faculty.isActive ? "Active" : "Deactivated"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Departments
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{faculty.departmentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Students</p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{faculty.studentCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Executives</h2>
        <div className="mt-3">
          {faculty.executives.length === 0 ? (
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
                {faculty.executives.map((executive) => (
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
        <h2 className="text-sm font-semibold text-ink">Edit faculty</h2>
        <div className="mt-4">
          <EditFacultyForm faculty={faculty} />
        </div>
      </div>

      <FacultyActions
        facultyId={faculty.facultyId}
        isActive={faculty.isActive}
        facultyName={faculty.name}
      />
    </div>
  );
}
