import "@/lib/serverOnly";
import { randomUUID } from "node:crypto";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  RefundResult,
  TransactionDetails,
  VerifyPaymentResult,
} from "./provider";

export interface SandboxOutcomePayload {
  clientReference: string;
  outcome: "success" | "failed" | "cancelled";
}

export class SandboxPaymentProvider implements PaymentProvider {
  readonly name = "SANDBOX";

  async initializePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const checkoutUrl = input.returnUrl.includes("/status/")
      ? input.returnUrl.replace("/status/", "/sandbox-checkout/")
      : input.returnUrl;

    return {
      checkoutUrl,
      providerReference: `SBX-${randomUUID()}`,
    };
  }

  async verifyPayment(): Promise<VerifyPaymentResult> {
    throw new Error(
      "Sandbox payments have no independent status to poll — outcomes only arrive via the sandbox webhook.",
    );
  }

  async processWebhook(rawBody: string): Promise<VerifyPaymentResult> {
    const payload = JSON.parse(rawBody) as SandboxOutcomePayload & { providerReference?: string };

    const statusMap: Record<SandboxOutcomePayload["outcome"], PaymentStatus> = {
      success: "success",
      failed: "failed",
      cancelled: "cancelled",
    };

    return {
      status: statusMap[payload.outcome],
      providerReference: payload.providerReference ?? `SBX-${randomUUID()}`,
      amountPesewas: 0, // sandbox never re-states an amount — the stored Payment row's amount is authoritative
      paidAt: payload.outcome === "success" ? new Date() : null,
    };
  }

  async refundPayment(): Promise<RefundResult> {
    return { refundReference: `SBX-REFUND-${randomUUID()}`, status: "success" };
  }

  async getTransaction(): Promise<TransactionDetails> {
    throw new Error(
      "Sandbox payments have no independent gateway-side transaction record to look up.",
    );
  }
}

export const sandboxPaymentProvider = new SandboxPaymentProvider();
