"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPaymentStatusAction } from "./actions";
import type { PaymentStatus } from "@/models";

const STATUS_COPY: Record<PaymentStatus, { title: string; description: string }> = {
  PENDING: {
    title: "Confirming your payment…",
    description: "This can take a moment. This page updates automatically.",
  },
  SUCCESSFUL: {
    title: "Payment successful",
    description: "Redirecting to your receipt…",
  },
  FAILED: {
    title: "Payment failed",
    description: "Your payment could not be completed. You can try again.",
  },
  CANCELLED: {
    title: "Payment cancelled",
    description: "You cancelled the payment. You can try again anytime.",
  },
  REFUNDED: {
    title: "Payment refunded",
    description: "This payment has been refunded.",
  },
};

export function StatusPoller({
  orgSlug,
  clientReference,
  initialStatus,
}: {
  orgSlug: string;
  clientReference: string;
  initialStatus: PaymentStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatus>(initialStatus);

  useEffect(() => {
    if (status !== "PENDING") return;

    const interval = setInterval(async () => {
      const payment = await getPaymentStatusAction(clientReference);
      if (!payment) return;
      setStatus(payment.status);
      if (payment.status === "SUCCESSFUL") {
        router.push(`/pay/${orgSlug}/receipt/${clientReference}`);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, clientReference, orgSlug, router]);

  const copy = STATUS_COPY[status];

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h1 className="text-lg font-semibold text-ink">{copy.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{copy.description}</p>
      {(status === "FAILED" || status === "CANCELLED") && (
        <Button asChild variant="secondary" className="mt-4">
          <Link href={`/pay/${orgSlug}`}>Try again</Link>
        </Button>
      )}
    </div>
  );
}
