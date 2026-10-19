import { notFound, redirect } from "next/navigation";
import { getPaymentByClientReference } from "@/services/payment.service";
import { Money } from "@/components/finance/money";
import { SandboxCheckoutActions } from "./sandbox-checkout-actions";

export default async function SandboxCheckoutPage({
  params,
}: PageProps<"/pay/[orgSlug]/sandbox-checkout/[clientReference]">) {
  const { orgSlug, clientReference } = await params;
  const payment = await getPaymentByClientReference(clientReference);
  if (!payment) {
    notFound();
  }

  if (payment.status !== "PENDING") {
    redirect(`/pay/${orgSlug}/status/${clientReference}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Sandbox checkout
        </p>
        <p className="mt-2 text-2xl font-semibold text-ink">
          <Money amountPesewas={payment.amountPesewas} />
        </p>
        <p className="mt-1 text-sm text-ink-muted">{payment.duesConfigurationName}</p>
        <p className="mt-3 text-xs text-ink-muted">
          Test-mode checkout — no real money moves. Used while payments are in sandbox mode.
        </p>
      </div>

      <SandboxCheckoutActions
        orgSlug={orgSlug}
        clientReference={clientReference}
        providerReference={payment.providerReference ?? ""}
      />
    </div>
  );
}
