"use client";

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
import {
  deactivateStudentCategoryAction,
  reactivateStudentCategoryAction,
  moveStudentCategoryAction,
} from "./actions";
import { EditStudentCategoryForm } from "./edit-student-category-form";
import type { StudentCategorySummary } from "@/services/student-category.service";

export function StudentCategoriesTable({ categories }: { categories: StudentCategorySummary[] }) {
  if (categories.length === 0) {
    return <p className="text-sm text-ink-muted">No student categories yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Sort order</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category, index) => (
          <TableRow key={category.studentCategoryId}>
            <TableCell className="font-medium text-ink">{category.name}</TableCell>
            <TableCell className="text-ink-muted">{category.code}</TableCell>
            <TableCell className="text-ink-muted">
              <div className="flex items-center gap-2">
                <span>{category.sortOrder}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Move ${category.name} up`}
                    disabled={index === 0}
                    onClick={() => moveStudentCategoryAction(category.studentCategoryId, "up")}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Move ${category.name} down`}
                    disabled={index === categories.length - 1}
                    onClick={() => moveStudentCategoryAction(category.studentCategoryId, "down")}
                  >
                    ↓
                  </Button>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={category.isActive ? "success" : "danger"}>
                {category.isActive ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              <EditStudentCategoryForm category={category} />
              {category.isActive ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      Deactivate
                    </Button>
                  }
                  title="Deactivate this category?"
                  description={`${category.name} will be hidden from new assignments.`}
                  confirmLabel="Deactivate"
                  confirmVariant="danger"
                  onConfirm={() => deactivateStudentCategoryAction(category.studentCategoryId)}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Reactivate
                    </Button>
                  }
                  title="Reactivate this category?"
                  description={`${category.name} will be available again.`}
                  confirmLabel="Reactivate"
                  onConfirm={() => reactivateStudentCategoryAction(category.studentCategoryId)}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
