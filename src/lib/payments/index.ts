import "@/lib/serverOnly";
import type { PaymentEnvironment } from "@/models";
import type { PaymentProvider } from "./provider";
import { sandboxPaymentProvider } from "./sandbox";
import { hubtelProvider } from "./hubtel";

export function getPaymentProvider(environment: PaymentEnvironment): PaymentProvider {
  return environment === "LIVE" ? hubtelProvider : sandboxPaymentProvider;
}

export { sandboxPaymentProvider } from "./sandbox";
export { hubtelProvider } from "./hubtel";
