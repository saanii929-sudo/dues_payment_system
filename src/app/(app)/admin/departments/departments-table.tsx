"use client";

import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deactivateDepartmentAction, reactivateDepartmentAction } from "./actions";
import type { DepartmentSummary } from "@/services/department.service";

export function DepartmentsTable({ departments }: { departments: DepartmentSummary[] }) {
  if (departments.length === 0) {
    return <p className="text-sm text-ink-muted">No departments yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Faculty</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {departments.map((department) => (
          <TableRow key={department.departmentId}>
            <TableCell className="font-medium text-ink">{department.name}</TableCell>
            <TableCell className="text-ink-muted">{department.code}</TableCell>
            <TableCell className="text-ink-muted">{department.facultyName}</TableCell>
            <TableCell>
              <Badge variant={department.isActive ? "success" : "danger"}>
                {department.isActive ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/departments/${department.departmentId}`}>View</Link>
              </Button>
              {department.isActive ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      Deactivate
                    </Button>
                  }
                  title="Deactivate this department?"
                  description={`${department.name} will be hidden from new assignments.`}
                  confirmLabel="Deactivate"
                  confirmVariant="danger"
                  onConfirm={() => deactivateDepartmentAction(department.departmentId)}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Reactivate
                    </Button>
                  }
                  title="Reactivate this department?"
                  description={`${department.name} will be available again.`}
                  confirmLabel="Reactivate"
                  onConfirm={() => reactivateDepartmentAction(department.departmentId)}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
