import { NextResponse } from "next/server";
import { recordPaymentOutcome, PaymentError } from "@/services/payment.service";
import { sandboxPaymentProvider } from "@/lib/payments";
import { getPlatformSettings } from "@/services/platform.service";

export async function POST(request: Request) {
  const settings = await getPlatformSettings();
  if (settings.paymentEnvironment !== "SANDBOX") {
    return NextResponse.json(
      { error: "The sandbox webhook is disabled outside SANDBOX mode." },
      { status: 403 },
    );
  }

  const rawBody = await request.text();

  try {
    await recordPaymentOutcome(sandboxPaymentProvider, rawBody, request.headers);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Sandbox webhook processing failed", error);
    const status = error instanceof PaymentError ? 404 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status },
    );
  }
}
