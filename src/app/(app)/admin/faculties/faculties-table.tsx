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
import { deactivateFacultyAction, reactivateFacultyAction } from "./actions";
import type { FacultySummary } from "@/services/faculty.service";

export function FacultiesTable({ faculties }: { faculties: FacultySummary[] }) {
  if (faculties.length === 0) {
    return <p className="text-sm text-ink-muted">No faculties yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {faculties.map((faculty) => (
          <TableRow key={faculty.facultyId}>
            <TableCell className="font-medium text-ink">{faculty.name}</TableCell>
            <TableCell className="text-ink-muted">{faculty.code}</TableCell>
            <TableCell>
              <Badge variant={faculty.isActive ? "success" : "danger"}>
                {faculty.isActive ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/faculties/${faculty.facultyId}`}>View</Link>
              </Button>
              {faculty.isActive ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      Deactivate
                    </Button>
                  }
                  title="Deactivate this faculty?"
                  description={`${faculty.name} and its departments will be hidden from new assignments.`}
                  confirmLabel="Deactivate"
                  confirmVariant="danger"
                  onConfirm={() => deactivateFacultyAction(faculty.facultyId)}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Reactivate
                    </Button>
                  }
                  title="Reactivate this faculty?"
                  description={`${faculty.name} will be available again.`}
                  confirmLabel="Reactivate"
                  onConfirm={() => reactivateFacultyAction(faculty.facultyId)}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
