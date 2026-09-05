"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAcademicLevelAction } from "./actions";
import type { AcademicLevelSummary } from "@/services/academic-level.service";

export function EditAcademicLevelForm({ level }: { level: AcademicLevelSummary }) {
  return (
    <EditDialog
      trigger={
        <Button variant="secondary" size="sm">
          Edit
        </Button>
      }
      title="Edit academic level"
      onSubmit={(formData) => updateAcademicLevelAction(level.academicLevelId, formData)}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`edit-name-${level.academicLevelId}`}>Name</Label>
        <Input
          id={`edit-name-${level.academicLevelId}`}
          name="name"
          required
          defaultValue={level.name}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`edit-code-${level.academicLevelId}`}>Code</Label>
        <Input
          id={`edit-code-${level.academicLevelId}`}
          name="code"
          required
          defaultValue={level.code}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`edit-sortOrder-${level.academicLevelId}`}>Sort order</Label>
        <Input
          id={`edit-sortOrder-${level.academicLevelId}`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={level.sortOrder}
        />
      </div>
    </EditDialog>
  );
}
