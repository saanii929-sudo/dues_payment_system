"use client";

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
import { PaymentPeriodStatusBadge } from "./status-badge";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString();
}

export function PaymentPeriodsTable({ periods }: { periods: PaymentPeriodSummary[] }) {
  if (periods.length === 0) {
    return <p className="text-sm text-ink-muted">No payment periods yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Academic year</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Payment window</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {periods.map((period) => (
          <TableRow key={period.paymentPeriodId}>
            <TableCell className="font-medium text-ink">{period.name}</TableCell>
            <TableCell className="text-ink-muted">{period.academicYear}</TableCell>
            <TableCell className="text-ink-muted">
              {formatDate(period.startDate)} – {formatDate(period.endDate)}
            </TableCell>
            <TableCell className="text-ink-muted">
              {formatDate(period.paymentOpenDate)} – {formatDate(period.paymentCloseDate)}
            </TableCell>
            <TableCell>
              <PaymentPeriodStatusBadge status={period.status} />
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/payment-periods/${period.paymentPeriodId}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
