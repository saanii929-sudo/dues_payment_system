"use client";

import * as React from "react";
import { useActionState } from "react";
import { assignRoleAction, type AssignRoleFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES, FACULTY_ROLES, DEPARTMENT_ROLES } from "@/lib/permissions/roles";
import type { Role as RoleKey } from "@/lib/permissions/roles";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";

const initialState: AssignRoleFormState = {};

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const ASSIGNABLE_ROLES: RoleKey[] = [ROLES.ORG_ADMIN, ...FACULTY_ROLES, ...DEPARTMENT_ROLES];

export function RoleAssignmentForm({
  faculties,
  departments,
}: {
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
}) {
  const [state, action, pending] = useActionState(assignRoleAction, initialState);
  const [role, setRole] = React.useState<RoleKey>(ROLES.ORG_ADMIN);

  const needsFaculty = FACULTY_ROLES.includes(role);
  const needsDepartment = DEPARTMENT_ROLES.includes(role);

  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          className={selectClassName}
          value={role}
          onChange={(event) => setRole(event.target.value as RoleKey)}
        >
          {ASSIGNABLE_ROLES.map((roleKey) => (
            <option key={roleKey} value={roleKey}>
              {roleKey}
            </option>
          ))}
        </select>
      </div>
      {needsFaculty && (
        <div className="space-y-1.5">
          <Label htmlFor="facultyId">Faculty</Label>
          <select id="facultyId" name="facultyId" required className={selectClassName}>
            {faculties.map((faculty) => (
              <option key={faculty.facultyId} value={faculty.facultyId}>
                {faculty.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {needsDepartment && (
        <div className="space-y-1.5">
          <Label htmlFor="departmentId">Department</Label>
          <select id="departmentId" name="departmentId" required className={selectClassName}>
            {departments.map((department) => (
              <option key={department.departmentId} value={department.departmentId}>
                {department.name} ({department.facultyName})
              </option>
            ))}
          </select>
        </div>
      )}
      {state?.error && (
        <p className="sm:col-span-2 rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="sm:col-span-2 rounded-md bg-success-muted px-3 py-2 text-sm text-success">
          Assigned. A password-setup link has been sent (check the server console in
          development).
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Assigning…" : "Assign role"}
        </Button>
      </div>
    </form>
  );
}
