import { NextResponse } from "next/server";
import { recordPaymentOutcome, PaymentError } from "@/services/payment.service";
import { hubtelProvider } from "@/lib/payments";

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    await recordPaymentOutcome(hubtelProvider, rawBody, request.headers);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Hubtel webhook processing failed", error);
    const status = error instanceof PaymentError ? 404 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status },
    );
  }
}
