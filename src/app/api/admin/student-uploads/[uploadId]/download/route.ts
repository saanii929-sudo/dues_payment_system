import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { getStudentListUploadFile, StudentListError } from "@/services/student-list.service";
import { ForbiddenError } from "@/lib/permissions/can";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  const session = await verifySession();
  if (!session.organizationId) {
    return NextResponse.json({ error: "No organization in scope." }, { status: 403 });
  }

  try {
    const file = await getStudentListUploadFile(session, session.organizationId, uploadId);
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
        "Content-Length": String(file.data.length),
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof StudentListError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
