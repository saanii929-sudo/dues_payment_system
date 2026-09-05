"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { updateDefaultRevenueSplits } from "@/services/platform.service";

const RevenueRulesSchema = z.object({
  organizationPercent: z.coerce.number().min(0).max(100),
  facultyPercent: z.coerce.number().min(0).max(100),
  departmentPercent: z.coerce.number().min(0).max(100),
});

export interface RevenueRulesFormState {
  error?: string;
  success?: boolean;
}

export async function updateRevenueRulesAction(
  _prevState: RevenueRulesFormState | undefined,
  formData: FormData,
): Promise<RevenueRulesFormState> {
  const session = await verifySession();
  const parsed = RevenueRulesSchema.safeParse({
    organizationPercent: formData.get("organizationPercent"),
    facultyPercent: formData.get("facultyPercent"),
    departmentPercent: formData.get("departmentPercent"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { organizationPercent, facultyPercent, departmentPercent } = parsed.data;
  const organizationBps = Math.round(organizationPercent * 100);
  const facultyBps = Math.round(facultyPercent * 100);
  const departmentBps = Math.round(departmentPercent * 100);

  if (organizationBps + facultyBps + departmentBps !== 10000) {
    const total = organizationPercent + facultyPercent + departmentPercent;
    return { error: `Percentages must sum to 100% (currently ${total}%).` };
  }

  try {
    await updateDefaultRevenueSplits(session, [
      { beneficiaryType: "ORGANIZATION", percentageBps: organizationBps },
      { beneficiaryType: "FACULTY", percentageBps: facultyBps },
      { beneficiaryType: "DEPARTMENT", percentageBps: departmentBps },
    ]);
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/super-admin/settings/revenue-rules");
  return { success: true };
}
