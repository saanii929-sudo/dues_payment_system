/** Amounts are stored as integer pesewas (minor units) — see ARCHITECTURE.md. */
export function formatPesewas(amountPesewas: number, currency = "GHS"): string {
  const amount = amountPesewas / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amount);
}

/** Inverse of formatPesewas — parses a GHS amount typed into a form (e.g. "50.00") into integer pesewas. */
export function parseGhsToPesewas(input: string): number {
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid, non-negative amount.");
  }
  return Math.round(amount * 100);
}
