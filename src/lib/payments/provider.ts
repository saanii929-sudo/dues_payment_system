export interface InitiatePaymentInput {
  /** Student's index number — the primary payment reference across the platform. */
  indexNumber: string;
  amountPesewas: number;
  description: string;
  callbackUrl: string;
  returnUrl: string;
  clientReference: string;
}

export interface InitiatePaymentResult {
  checkoutUrl: string | null;
  providerReference: string;
}

export type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

export interface VerifyPaymentResult {
  status: PaymentStatus;
  providerReference: string;
  amountPesewas: number;
  paidAt: Date | null;
}

export interface RefundPaymentInput {
  providerReference: string;
  amountPesewas: number;
  reason: string;
}

export type RefundStatus = "pending" | "success" | "failed";

export interface RefundResult {
  refundReference: string;
  status: RefundStatus;
}

export interface TransactionDetails {
  providerReference: string;
  status: PaymentStatus;
  amountPesewas: number;
  currency: string;
  channel: string | null;
  paidAt: Date | null;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  initializePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verifyPayment(providerReference: string): Promise<VerifyPaymentResult>;
  processWebhook(rawBody: string, headers: Headers): Promise<VerifyPaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundResult>;
  getTransaction(providerReference: string): Promise<TransactionDetails>;
}
