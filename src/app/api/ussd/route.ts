import { NextResponse } from "next/server";
import { handleUssdRequest } from "@/services/ussd.service";


export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get("org");
  if (!orgSlug) {
    return NextResponse.json({ error: "Missing org query parameter." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    phoneNumber?: string;
    text?: string;
  } | null;

  if (!body?.sessionId || !body.phoneNumber) {
    return new NextResponse("END Invalid request.", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const host = request.headers.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const appBaseUrl = `${protocol}://${host}`;

  const result = await handleUssdRequest(
    orgSlug,
    {
      sessionId: body.sessionId,
      phoneNumber: body.phoneNumber,
      text: body.text ?? "",
    },
    appBaseUrl,
  );

  const prefix = result.continue ? "CON" : "END";
  return new NextResponse(`${prefix} ${result.message}`, {
    headers: { "Content-Type": "text/plain" },
  });
}
