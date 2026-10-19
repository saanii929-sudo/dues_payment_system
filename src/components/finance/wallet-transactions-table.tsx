import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/finance/money";
import {
  WALLET_TRANSACTION_TYPE_LABEL,
  WALLET_DIRECTION_VARIANT,
  WALLET_DIRECTION_LABEL,
  formatDateTime,
} from "@/components/finance/withdrawal-status";
import type { WalletTransactionSummary } from "@/services/wallet.service";

export function WalletTransactionsTable({ transactions }: { transactions: WalletTransactionSummary[] }) {
  if (transactions.length === 0) {
    return <p className="text-sm text-ink-muted">No wallet activity yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Balance after</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.walletTransactionId}>
            <TableCell className="text-ink-muted">{formatDateTime(transaction.createdAt)}</TableCell>
            <TableCell className="text-ink-muted">{WALLET_TRANSACTION_TYPE_LABEL[transaction.sourceType]}</TableCell>
            <TableCell>
              <Badge variant={WALLET_DIRECTION_VARIANT[transaction.direction]}>
                {WALLET_DIRECTION_LABEL[transaction.direction]}
              </Badge>
            </TableCell>
            <TableCell className="font-medium text-ink">
              <Money amountPesewas={transaction.amountPesewas} />
            </TableCell>
            <TableCell className="text-ink-muted">
              {transaction.direction === "HOLD" ? (
                "—"
              ) : (
                <Money amountPesewas={transaction.balanceAfterPesewas} />
              )}
            </TableCell>
            <TableCell className="text-ink-muted">{transaction.description ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
