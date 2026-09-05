"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStudentCategoryAction } from "./actions";
import type { StudentCategorySummary } from "@/services/student-category.service";

export function EditStudentCategoryForm({ category }: { category: StudentCategorySummary }) {
  return (
    <EditDialog
      trigger={
        <Button variant="secondary" size="sm">
          Edit
        </Button>
      }
      title="Edit student category"
      onSubmit={(formData) => updateStudentCategoryAction(category.studentCategoryId, formData)}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`edit-name-${category.studentCategoryId}`}>Name</Label>
        <Input
          id={`edit-name-${category.studentCategoryId}`}
          name="name"
          required
          defaultValue={category.name}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`edit-code-${category.studentCategoryId}`}>Code</Label>
        <Input
          id={`edit-code-${category.studentCategoryId}`}
          name="code"
          required
          defaultValue={category.code}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`edit-sortOrder-${category.studentCategoryId}`}>Sort order</Label>
        <Input
          id={`edit-sortOrder-${category.studentCategoryId}`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={category.sortOrder}
        />
      </div>
    </EditDialog>
  );
}
