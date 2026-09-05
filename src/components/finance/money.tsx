import { cn } from "@/utils/cn";
import { formatPesewas } from "@/lib/format/currency";

interface MoneyProps {
  amountPesewas: number;
  currency?: string;
  className?: string;
}

/** Not yet exercised by real financial data — ready for the payment/wallet phases. */
export function Money({ amountPesewas, currency = "GHS", className }: MoneyProps) {
  const isNegative = amountPesewas < 0;
  return (
    <span className={cn("tabular-nums", isNegative ? "text-danger" : "text-ink", className)}>
      {formatPesewas(amountPesewas, currency)}
    </span>
  );
}
