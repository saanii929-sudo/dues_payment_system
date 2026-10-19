import { notFound, redirect } from "next/navigation";
import { getPaymentByClientReference } from "@/services/payment.service";
import { StatusPoller } from "./status-poller";

export default async function PaymentStatusPage({
  params,
}: PageProps<"/pay/[orgSlug]/status/[clientReference]">) {
  const { orgSlug, clientReference } = await params;
  const payment = await getPaymentByClientReference(clientReference);
  if (!payment) {
    notFound();
  }

  if (payment.status === "SUCCESSFUL") {
    redirect(`/pay/${orgSlug}/receipt/${clientReference}`);
  }

  return (
    <StatusPoller orgSlug={orgSlug} clientReference={clientReference} initialStatus={payment.status} />
  );
}
