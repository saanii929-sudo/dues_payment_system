export interface InitiatePaymentInput {
  /** Student's index number — the primary payment reference across the platform. */
  indexNumber: string;
  amountPesewas: number;
  description: string;
  /** Where the provider should send its callback/webhook. */
  callbackUrl: string;
  /** Internal reference to reconcile the callback against our own payment record. */
  clientReference: string;
}

export interface InitiatePaymentResult {
  /** URL to redirect the payer to, or null for a direct-charge flow. */
  checkoutUrl: string | null;
  providerReference: string;
}

export type PaymentStatus = "pending" | "success" | "failed";

export interface VerifyPaymentResult {
  status: PaymentStatus;
  providerReference: string;
  amountPesewas: number;
  paidAt: Date | null;
}

export interface PaymentProvider {
  readonly name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verify(providerReference: string): Promise<VerifyPaymentResult>;
  
  parseWebhook(rawBody: string, headers: Headers): Promise<VerifyPaymentResult>;
}
