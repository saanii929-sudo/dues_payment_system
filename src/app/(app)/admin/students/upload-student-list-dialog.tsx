"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadStudentListAction } from "./actions";

/**
 * `EditDialog` builds its `FormData` from `new FormData(formElement)`, which
 * natively captures `<input type="file">` values as `File` objects — no
 * bespoke dialog needed for the upload form. See ARCHITECTURE.md Phase 23.
 */
export function UploadStudentListDialog() {
  return (
    <EditDialog
      trigger={<Button size="sm">Upload student list</Button>}
      title="Upload student list"
      description="CSV or Excel (.csv, .xlsx, .xls), up to 5MB. Index Number and Full Name columns are required; Faculty, Department, Academic Level, and Student Category are optional."
      submitLabel="Upload"
      onSubmit={uploadStudentListAction}
    >
      <div className="space-y-1.5">
        <Label htmlFor="student-list-file">File</Label>
        <Input id="student-list-file" name="file" type="file" accept=".csv,.xlsx,.xls" required />
      </div>
    </EditDialog>
  );
}
