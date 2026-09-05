"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  deactivatePaymentPeriodAction,
  reactivatePaymentPeriodAction,
  setCurrentPaymentPeriodAction,
} from "./actions";
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
          <TableHead>Code</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {periods.map((period) => (
          <TableRow key={period.paymentPeriodId}>
            <TableCell className="font-medium text-ink">{period.name}</TableCell>
            <TableCell className="text-ink-muted">{period.code}</TableCell>
            <TableCell className="text-ink-muted">
              {formatDate(period.startDate)} – {formatDate(period.endDate)}
            </TableCell>
            <TableCell className="space-x-1.5">
              <Badge variant={period.isActive ? "success" : "danger"}>
                {period.isActive ? "Active" : "Deactivated"}
              </Badge>
              {period.isCurrent && <Badge variant="info">Current</Badge>}
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              {!period.isCurrent && period.isActive && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPaymentPeriodAction(period.paymentPeriodId)}
                >
                  Set as current
                </Button>
              )}
              {period.isActive ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      Deactivate
                    </Button>
                  }
                  title="Deactivate this payment period?"
                  description={`${period.name} will be hidden from new dues configurations.`}
                  confirmLabel="Deactivate"
                  confirmVariant="danger"
                  onConfirm={() => deactivatePaymentPeriodAction(period.paymentPeriodId)}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Reactivate
                    </Button>
                  }
                  title="Reactivate this payment period?"
                  description={`${period.name} will be available again.`}
                  confirmLabel="Reactivate"
                  onConfirm={() => reactivatePaymentPeriodAction(period.paymentPeriodId)}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
