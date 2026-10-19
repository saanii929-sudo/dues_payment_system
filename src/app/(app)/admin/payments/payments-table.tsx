import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/finance/money";
import { PaymentStatusBadge } from "./status-badge";
import type { PaymentRecordSummary } from "@/services/payment.service";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString();
}

export function PaymentsTable({ payments }: { payments: PaymentRecordSummary[] }) {
  if (payments.length === 0) {
    return <p className="text-sm text-ink-muted">No payments match your filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Index number</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Faculty allocation</TableHead>
            <TableHead className="text-right">Department allocation</TableHead>
            <TableHead>Gateway reference</TableHead>
            <TableHead>Payment date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.paymentId}>
              <TableCell className="font-medium text-ink">{payment.studentFullName}</TableCell>
              <TableCell className="text-ink-muted">{payment.studentIndexNumber}</TableCell>
              <TableCell className="text-right">
                <Money amountPesewas={payment.amountPesewas} />
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={payment.status} />
              </TableCell>
              <TableCell className="text-right text-ink-muted">
                {payment.facultyAllocationPesewas !== null ? (
                  <Money amountPesewas={payment.facultyAllocationPesewas} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right text-ink-muted">
                {payment.departmentAllocationPesewas !== null ? (
                  <Money amountPesewas={payment.departmentAllocationPesewas} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-ink-muted">
                {payment.providerReference ?? "—"}
              </TableCell>
              <TableCell className="text-ink-muted">{formatDate(payment.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/admin/payments/${payment.paymentId}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
