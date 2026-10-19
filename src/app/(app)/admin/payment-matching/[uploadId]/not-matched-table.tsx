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
import { formatDateTime } from "../status";
import type { NotMatchedPayment } from "@/services/student-payment-matching.service";

export function NotMatchedTable({ payments }: { payments: NotMatchedPayment[] }) {
  if (payments.length === 0) {
    return <p className="text-sm text-ink-muted">Every payment in this scope matched a roster row.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Index number</TableHead>
          <TableHead>Name on payment</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Payment status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.paymentId}>
            <TableCell className="font-medium text-ink">{payment.indexNumber}</TableCell>
            <TableCell className="text-ink-muted">{payment.studentFullName}</TableCell>
            <TableCell className="text-ink-muted">
              <Money amountPesewas={payment.amountPesewas} />
            </TableCell>
            <TableCell>
              <Badge variant="neutral">{payment.status}</Badge>
            </TableCell>
            <TableCell className="text-ink-muted">{formatDateTime(payment.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
