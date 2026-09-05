import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";

/** Protected API endpoint example — every future API route follows this shape. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return NextResponse.json(session);
}
