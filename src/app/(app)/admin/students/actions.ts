"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { uploadStudentList, StudentListError } from "@/services/student-list.service";

export async function uploadStudentListAction(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV or Excel file to upload.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadStudentList(session, session.organizationId, {
      buffer,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name,
      sizeBytes: file.size,
    });
  } catch (error) {
    if (error instanceof StudentListError) throw new Error(error.message);
    throw error;
  }

  revalidatePath("/admin/students");
}
