"use server";

import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { uploadStudentList, StudentListError } from "@/services/student-list.service";
import { runPaymentMatching, StudentPaymentMatchingError } from "@/services/student-payment-matching.service";
import type { PaymentFilters } from "@/services/payment.service";

function paramOrUndefined(value: FormDataEntryValue | null): string | undefined {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : undefined;
}

/** Uploads the roster (Phase 23's pipeline, reused unchanged), then immediately runs matching against it, then redirects to the results page with the exact filter scope carried in the URL. See ARCHITECTURE.md Phase 24. */
export async function runMatchingAction(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const filters: PaymentFilters = {
    paymentPeriodId: paramOrUndefined(formData.get("paymentPeriodId")),
    facultyId: paramOrUndefined(formData.get("facultyId")),
    departmentId: paramOrUndefined(formData.get("departmentId")),
    academicLevelId: paramOrUndefined(formData.get("academicLevelId")),
    studentCategoryId: paramOrUndefined(formData.get("studentCategoryId")),
  };
  if (!filters.paymentPeriodId) {
    throw new Error("A payment period is required.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV or Excel file to upload.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  let uploadId: string;
  try {
    uploadId = await uploadStudentList(session, session.organizationId, {
      buffer,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name,
      sizeBytes: file.size,
    });
    await runPaymentMatching(session, session.organizationId, uploadId, filters);
  } catch (error) {
    if (error instanceof StudentListError || error instanceof StudentPaymentMatchingError) {
      throw new Error(error.message);
    }
    throw error;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  redirect(`/admin/payment-matching/${uploadId}?${query.toString()}`);
}
