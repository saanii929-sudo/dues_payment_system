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
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditDialog } from "@/components/ui/edit-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/finance/money";
import { WITHDRAWAL_STATUS_VARIANT, WITHDRAWAL_STATUS_LABEL, formatDateTime } from "@/components/finance/withdrawal-status";
import { WithdrawalRequestDialog } from "./withdrawal-request-dialog";
import { WithdrawalHistoryDialog } from "./withdrawal-history-dialog";
import type { WithdrawalRequestSummary } from "@/services/withdrawal.service";
import {
  submitWithdrawalAction,
  cancelWithdrawalAction,
  decideFirstStageWithdrawalAction,
} from "./actions";

const EDITABLE_STATUSES: WithdrawalRequestSummary["status"][] = ["DRAFT", "RETURNED_FOR_CORRECTION"];
const CANCELLABLE_STATUSES: WithdrawalRequestSummary["status"][] = [
  "DRAFT",
  "PENDING_DEAN_APPROVAL",
  "RETURNED_FOR_CORRECTION",
  "PENDING_SUPER_ADMIN_APPROVAL",
  "SUPER_ADMIN_APPROVED",
];

/**
 * Faculty's own withdrawal queue (Phase 19) — richer than Department's
 * shared minimal table: Draft editing/submission/cancellation for the
 * Treasurer/President, and Approve/Reject/Return-with-note for the Dean.
 * See ARCHITECTURE.md Phase 19.
 */
export function FacultyWithdrawalTable({
  facultyId,
  requests,
  availableBalancePesewas,
  isTreasurer,
  isDean,
}: {
  facultyId: string;
  requests: WithdrawalRequestSummary[];
  availableBalancePesewas: number;
  isTreasurer: boolean;
  isDean: boolean;
}) {
  if (requests.length === 0) {
    return <p className="text-sm text-ink-muted">No withdrawal requests yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Amount</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead>Requested by</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => {
          const canEdit = isTreasurer && EDITABLE_STATUSES.includes(request.status);
          const canCancel = isTreasurer && CANCELLABLE_STATUSES.includes(request.status);
          const canDecide = isDean && request.status === "PENDING_DEAN_APPROVAL";

          return (
            <TableRow key={request.withdrawalRequestId}>
              <TableCell className="font-medium text-ink">
                <Money amountPesewas={request.amountPesewas} />
              </TableCell>
              <TableCell className="text-ink-muted">{request.reason}</TableCell>
              <TableCell className="text-ink-muted">
                {request.destinationProvider} · {request.destinationAccountNumber}
              </TableCell>
              <TableCell className="text-ink-muted">{request.requestedByName ?? "—"}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant={WITHDRAWAL_STATUS_VARIANT[request.status]}>
                    {WITHDRAWAL_STATUS_LABEL[request.status]}
                  </Badge>
                  {request.status === "RETURNED_FOR_CORRECTION" && request.correctionNote && (
                    <p className="max-w-xs text-xs text-danger">&ldquo;{request.correctionNote}&rdquo;</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-ink-muted">{formatDateTime(request.createdAt)}</TableCell>
              <TableCell className="text-right space-x-1.5">
                <WithdrawalHistoryDialog facultyId={facultyId} requestId={request.withdrawalRequestId} />

                {canEdit && (
                  <WithdrawalRequestDialog
                    trigger={
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    }
                    facultyId={facultyId}
                    availableBalancePesewas={availableBalancePesewas}
                    existing={request}
                  />
                )}

                {canEdit && (
                  <ConfirmDialog
                    trigger={<Button size="sm">Submit</Button>}
                    title="Submit this withdrawal request?"
                    description="This sends it to the Faculty Dean for approval."
                    confirmLabel="Submit"
                    onConfirm={() => submitWithdrawalAction(facultyId, request.withdrawalRequestId)}
                  />
                )}

                {canCancel && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm">
                        Cancel
                      </Button>
                    }
                    title="Cancel this withdrawal request?"
                    description="This cannot be undone — a new request would need to be created if funds are still needed."
                    confirmLabel="Cancel request"
                    confirmVariant="danger"
                    onConfirm={() => cancelWithdrawalAction(facultyId, request.withdrawalRequestId)}
                  />
                )}

                {canDecide && (
                  <>
                    <ConfirmDialog
                      trigger={
                        <Button variant="secondary" size="sm">
                          Approve
                        </Button>
                      }
                      title="Approve this withdrawal request?"
                      description="This escalates the request to the Super Admin for final approval — it does not release funds yet."
                      confirmLabel="Approve"
                      onConfirm={() =>
                        decideFirstStageWithdrawalAction(facultyId, request.withdrawalRequestId, "APPROVED")
                      }
                    />
                    <EditDialog
                      trigger={
                        <Button variant="ghost" size="sm">
                          Return
                        </Button>
                      }
                      title="Return for correction"
                      description="The Treasurer/President will be able to edit and resubmit. A note explaining what to fix is required."
                      submitLabel="Return"
                      onSubmit={async (formData) => {
                        await decideFirstStageWithdrawalAction(
                          facultyId,
                          request.withdrawalRequestId,
                          "RETURNED",
                          String(formData.get("comment") ?? ""),
                        );
                      }}
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor={`return-comment-${request.withdrawalRequestId}`}>Note</Label>
                        <Textarea id={`return-comment-${request.withdrawalRequestId}`} name="comment" rows={3} required />
                      </div>
                    </EditDialog>
                    <ConfirmDialog
                      trigger={
                        <Button variant="danger" size="sm">
                          Reject
                        </Button>
                      }
                      title="Reject this withdrawal request?"
                      description="This is terminal — the requester will need to submit a new request if funds are still needed."
                      confirmLabel="Reject"
                      confirmVariant="danger"
                      onConfirm={() =>
                        decideFirstStageWithdrawalAction(facultyId, request.withdrawalRequestId, "REJECTED")
                      }
                    />
                  </>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
