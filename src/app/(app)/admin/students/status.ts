import type { badgeVariants } from "@/components/ui/badge";
import type { StudentListUploadStatus, StudentListRowStatus } from "@/models";
import type { VariantProps } from "class-variance-authority";

export const UPLOAD_STATUS_VARIANT: Record<StudentListUploadStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  PROCESSING: "pending",
  COMPLETED: "success",
  FAILED: "danger",
};

export const ROW_STATUS_VARIANT: Record<StudentListRowStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  VALID: "success",
  INVALID: "danger",
  DUPLICATE: "pending",
};

export function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}
