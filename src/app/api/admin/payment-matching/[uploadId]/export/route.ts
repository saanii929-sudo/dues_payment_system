import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import {
  exportPaymentMatchingReport,
  StudentPaymentMatchingError,
} from "@/services/student-payment-matching.service";
import { ForbiddenError } from "@/lib/permissions/can";
import type { PaymentFilters } from "@/services/payment.service";

/** Regenerates the same report live from the query string's filter scope and streams a two-sheet .xlsx workbook. See ARCHITECTURE.md Phase 24. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  const session = await verifySession();
  if (!session.organizationId) {
    return NextResponse.json({ error: "No organization in scope." }, { status: 403 });
  }

  const url = new URL(request.url);
  const filters: PaymentFilters = {
    paymentPeriodId: url.searchParams.get("paymentPeriodId") ?? undefined,
    facultyId: url.searchParams.get("facultyId") ?? undefined,
    departmentId: url.searchParams.get("departmentId") ?? undefined,
    academicLevelId: url.searchParams.get("academicLevelId") ?? undefined,
    studentCategoryId: url.searchParams.get("studentCategoryId") ?? undefined,
  };

  try {
    const buffer = await exportPaymentMatchingReport(session, session.organizationId, uploadId, filters);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="payment-matching-${uploadId}.xlsx"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof StudentPaymentMatchingError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
