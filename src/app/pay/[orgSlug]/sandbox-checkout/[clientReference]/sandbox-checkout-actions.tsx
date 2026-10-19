"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Outcome = "success" | "failed" | "cancelled";

export function SandboxCheckoutActions({
  orgSlug,
  clientReference,
  providerReference,
}: {
  orgSlug: string;
  clientReference: string;
  providerReference: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate(outcome: Outcome) {
    setPending(outcome);
    setError(null);
    try {
      const response = await fetch("/api/webhooks/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientReference, outcome, providerReference }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Simulation failed.");
      }
      router.push(`/pay/${orgSlug}/status/${clientReference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" disabled={pending !== null} onClick={() => simulate("success")}>
        {pending === "success" ? "Simulating…" : "Simulate Successful"}
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        disabled={pending !== null}
        onClick={() => simulate("cancelled")}
      >
        {pending === "cancelled" ? "Simulating…" : "Simulate Cancelled"}
      </Button>
      <Button
        variant="danger"
        className="w-full"
        disabled={pending !== null}
        onClick={() => simulate("failed")}
      >
        {pending === "failed" ? "Simulating…" : "Simulate Failed"}
      </Button>
      {error && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
