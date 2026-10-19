"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { adjustLedgerEntry, RevenueAllocationError } from "@/services/revenue-allocation.service";

const AdjustFormSchema = z.object({
  newFacultyShareAmount: z.coerce.number().min(0, { message: "The Faculty share cannot be negative." }),
  reason: z.string().min(1, { message: "A reason is required." }),
});

export async function adjustLedgerEntryAction(entryId: string, formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session.organizationId) throw new Error("No organization in scope.");

  const parsed = AdjustFormSchema.safeParse({
    newFacultyShareAmount: formData.get("newFacultyShareAmount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await adjustLedgerEntry(session, session.organizationId, entryId, {
      newFacultyShareAmountPesewas: Math.round(parsed.data.newFacultyShareAmount * 100),
      reason: parsed.data.reason,
    });
  } catch (error) {
    if (error instanceof RevenueAllocationError) {
      throw new Error(error.message);
    }
    throw error;
  }

  revalidatePath("/admin/ledger");
  revalidatePath("/admin/payments");
}
