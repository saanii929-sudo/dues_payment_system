import "@/lib/serverOnly";
import { getEnv } from "@/lib/validation/env";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  RefundPaymentInput,
  RefundResult,
  TransactionDetails,
  VerifyPaymentResult,
} from "./provider";

export class PaymentProviderConfigError extends Error {}

const HUBTEL_CHECKOUT_URL = "https://payproxyapi.hubtel.com/items/initiate";
const HUBTEL_STATUS_URL = "https://payproxyapi.hubtel.com/transactions";
const HUBTEL_REFUND_URL = "https://payproxyapi.hubtel.com/refund";

interface HubtelCredentials {
  clientId: string;
  clientSecret: string;
  posSalesId: string;
}

function mapHubtelStatus(status: string | undefined): PaymentStatus {
  switch ((status ?? "").toLowerCase()) {
    case "success":
    case "paid":
      return "success";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "pending":
      return "pending";
    default:
      return "failed";
  }
}

export class HubtelProvider implements PaymentProvider {
  readonly name = "HUBTEL";

  private credentials(): HubtelCredentials {
    const env = getEnv();
    if (!env.HUBTEL_CLIENT_ID || !env.HUBTEL_CLIENT_SECRET || !env.HUBTEL_POS_SALES_ID) {
      throw new PaymentProviderConfigError(
        "Hubtel is not configured — set HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, and HUBTEL_POS_SALES_ID before switching paymentEnvironment to LIVE.",
      );
    }
    return {
      clientId: env.HUBTEL_CLIENT_ID,
      clientSecret: env.HUBTEL_CLIENT_SECRET,
      posSalesId: env.HUBTEL_POS_SALES_ID,
    };
  }

  private authHeader(credentials: HubtelCredentials): string {
    const encoded = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString(
      "base64",
    );
    return `Basic ${encoded}`;
  }

  async initializePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const credentials = this.credentials();

    const response = await fetch(HUBTEL_CHECKOUT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader(credentials),
      },
      body: JSON.stringify({
        totalAmount: input.amountPesewas / 100,
        description: input.description,
        callbackUrl: input.callbackUrl,
        returnUrl: input.returnUrl,
        cancellationUrl: input.returnUrl,
        merchantAccountNumber: credentials.posSalesId,
        clientReference: input.clientReference,
      }),
    });

    if (!response.ok) {
      throw new Error(`Hubtel checkout initiation failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      data?: { checkoutUrl?: string; checkoutId?: string };
      message?: string;
    };

    if (!payload.data?.checkoutUrl || !payload.data.checkoutId) {
      throw new Error(payload.message ?? "Hubtel did not return a checkout URL.");
    }

    return {
      checkoutUrl: payload.data.checkoutUrl,
      providerReference: payload.data.checkoutId,
    };
  }

  async verifyPayment(providerReference: string): Promise<VerifyPaymentResult> {
    const credentials = this.credentials();
    const response = await fetch(
      `${HUBTEL_STATUS_URL}/${credentials.posSalesId}/status?checkoutId=${encodeURIComponent(providerReference)}`,
      { headers: { Authorization: this.authHeader(credentials) } },
    );

    if (!response.ok) {
      throw new Error(`Hubtel status check failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      data?: { status?: string; amount?: number; transactionId?: string; date?: string };
    };

    return {
      status: mapHubtelStatus(payload.data?.status),
      providerReference: payload.data?.transactionId ?? providerReference,
      amountPesewas: Math.round((payload.data?.amount ?? 0) * 100),
      paidAt: payload.data?.date ? new Date(payload.data.date) : null,
    };
  }

  async processWebhook(rawBody: string): Promise<VerifyPaymentResult> {
    const payload = JSON.parse(rawBody) as {
      Data?: {
        CheckoutId?: string;
        Status?: string;
        Amount?: number;
        TransactionId?: string;
        Date?: string;
      };
    };
    const data = payload.Data ?? {};

    return {
      status: mapHubtelStatus(data.Status),
      providerReference: data.TransactionId ?? data.CheckoutId ?? "",
      amountPesewas: Math.round((data.Amount ?? 0) * 100),
      paidAt: data.Date ? new Date(data.Date) : null,
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundResult> {
    const credentials = this.credentials();
    const response = await fetch(HUBTEL_REFUND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader(credentials),
      },
      body: JSON.stringify({
        transactionId: input.providerReference,
        amount: input.amountPesewas / 100,
        reason: input.reason,
        merchantAccountNumber: credentials.posSalesId,
      }),
    });

    if (!response.ok) {
      return { refundReference: "", status: "failed" };
    }

    const payload = (await response.json()) as {
      data?: { refundId?: string; status?: string };
    };

    const status = (payload.data?.status ?? "").toLowerCase();
    return {
      refundReference: payload.data?.refundId ?? "",
      status: status === "success" || status === "approved" ? "success" : status === "pending" ? "pending" : "failed",
    };
  }

  async getTransaction(providerReference: string): Promise<TransactionDetails> {
    const credentials = this.credentials();
    const response = await fetch(
      `${HUBTEL_STATUS_URL}/${credentials.posSalesId}/status?checkoutId=${encodeURIComponent(providerReference)}`,
      { headers: { Authorization: this.authHeader(credentials) } },
    );

    if (!response.ok) {
      throw new Error(`Hubtel transaction lookup failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      data?: {
        status?: string;
        amount?: number;
        transactionId?: string;
        date?: string;
        channel?: string;
        currency?: string;
      };
    };
    const data = payload.data ?? {};

    return {
      providerReference: data.transactionId ?? providerReference,
      status: mapHubtelStatus(data.status),
      amountPesewas: Math.round((data.amount ?? 0) * 100),
      currency: data.currency ?? "GHS",
      channel: data.channel ?? null,
      paidAt: data.date ? new Date(data.date) : null,
      raw: payload,
    };
  }
}

export const hubtelProvider = new HubtelProvider();
