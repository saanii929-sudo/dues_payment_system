"use client";

import { useActionState, useState } from "react";
import { initiatePaymentAction, type InitiatePaymentFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicFacultyOption } from "@/services/faculty.service";
import type { PublicDepartmentOption } from "@/services/department.service";
import type { PublicAcademicLevelOption } from "@/services/academic-level.service";
import type { PublicStudentCategoryOption } from "@/services/student-category.service";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const initialState: InitiatePaymentFormState = {};

export function PaymentForm({
  orgSlug,
  faculties,
  departments,
  academicLevels,
  studentCategories,
}: {
  orgSlug: string;
  faculties: PublicFacultyOption[];
  departments: PublicDepartmentOption[];
  academicLevels: PublicAcademicLevelOption[];
  studentCategories: PublicStudentCategoryOption[];
}) {
  const boundAction = initiatePaymentAction.bind(null, orgSlug);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const [facultyId, setFacultyId] = useState("");

  const visibleDepartments = departments.filter(
    (department) => !facultyId || department.facultyId === facultyId,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="indexNumber">Index number</Label>
        <Input id="indexNumber" name="indexNumber" required placeholder="e.g. UG12345678" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required placeholder="e.g. Ama Mensah" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="academicLevelId">Academic level</Label>
          <select id="academicLevelId" name="academicLevelId" required className={selectClassName} defaultValue="">
            <option value="" disabled>
              Select
            </option>
            {academicLevels.map((level) => (
              <option key={level.academicLevelId} value={level.academicLevelId}>
                {level.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentCategoryId">Student category</Label>
          <select
            id="studentCategoryId"
            name="studentCategoryId"
            required
            className={selectClassName}
            defaultValue=""
          >
            <option value="" disabled>
              Select
            </option>
            {studentCategories.map((category) => (
              <option key={category.studentCategoryId} value={category.studentCategoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {faculties.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="facultyId">Faculty (if applicable)</Label>
            <select
              id="facultyId"
              name="facultyId"
              className={selectClassName}
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
            >
              <option value="">Not applicable</option>
              {faculties.map((faculty) => (
                <option key={faculty.facultyId} value={faculty.facultyId}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="departmentId">Department (if applicable)</Label>
            <select id="departmentId" name="departmentId" className={selectClassName} defaultValue="">
              <option value="">Not applicable</option>
              {visibleDepartments.map((department) => (
                <option key={department.departmentId} value={department.departmentId}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" placeholder="For your receipt" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" name="email" type="email" placeholder="For your receipt" />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Finding your dues…" : "Continue to pay"}
      </Button>
    </form>
  );
}
