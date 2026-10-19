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
import { EditDialog } from "@/components/ui/edit-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/finance/money";
import {
  WITHDRAWAL_STATUS_VARIANT,
  WITHDRAWAL_STATUS_LABEL,
  approvalStageLabel,
  formatDateTime,
} from "@/components/finance/withdrawal-status";
import type { WithdrawalRequestSummary } from "@/services/withdrawal.service";
import { decideApprovalQueueAction } from "./actions";

/**
 * The Approval Queue's table (Phase 21) — every column the phase asks for
 * (Requester, Organization, Faculty/Department, Amount, Reason, Submitted
 * date, Current approval stage, Status) plus Approve/Reject/Return, each a
 * confirmation dialog with a comment field (optional for Approve/Reject,
 * required for Return — `decideApprovalQueueAction` dispatches to the right
 * stage's decision function by the viewer's own role). See ARCHITECTURE.md
 * Phase 21.
 */
export function ApprovalQueueTable({
  requests,
  stage,
}: {
  requests: WithdrawalRequestSummary[];
  stage: "FIRST" | "SUPER_ADMIN";
}) {
  if (requests.length === 0) {
    return <p className="text-sm text-ink-muted">Nothing is currently awaiting your decision.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Requester</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead>Faculty/Department</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Approval stage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.withdrawalRequestId}>
            <TableCell className="text-ink-muted">{request.requestedByName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{request.organizationName ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">
              {request.facultyName ?? request.departmentName ?? "—"}
            </TableCell>
            <TableCell className="font-medium text-ink">
              <Money amountPesewas={request.amountPesewas} />
            </TableCell>
            <TableCell className="text-ink-muted">{request.reason}</TableCell>
            <TableCell className="text-ink-muted">{formatDateTime(request.createdAt)}</TableCell>
            <TableCell className="text-ink-muted">{approvalStageLabel(request.status)}</TableCell>
            <TableCell>
              <Badge variant={WITHDRAWAL_STATUS_VARIANT[request.status]}>
                {WITHDRAWAL_STATUS_LABEL[request.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              <EditDialog
                trigger={
                  <Button variant="secondary" size="sm">
                    Approve
                  </Button>
                }
                title="Approve this withdrawal request?"
                description={
                  stage === "FIRST"
                    ? "This escalates the request to the Super Admin for final approval — it does not release funds yet."
                    : "This does not release funds yet — a separate release step actually moves money."
                }
                submitLabel="Approve"
                onSubmit={async (formData) => {
                  await decideApprovalQueueAction(
                    request.withdrawalRequestId,
                    "APPROVED",
                    String(formData.get("comment") ?? "") || undefined,
                  );
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`approve-comment-${request.withdrawalRequestId}`}>Comment (optional)</Label>
                  <Textarea id={`approve-comment-${request.withdrawalRequestId}`} name="comment" rows={2} />
                </div>
              </EditDialog>

              {stage === "FIRST" && (
                <EditDialog
                  trigger={
                    <Button variant="ghost" size="sm">
                      Return
                    </Button>
                  }
                  title="Return for correction"
                  description="The requester will be able to edit and resubmit. A note explaining what to fix is required."
                  submitLabel="Return"
                  onSubmit={async (formData) => {
                    await decideApprovalQueueAction(
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
              )}

              <EditDialog
                trigger={
                  <Button variant="danger" size="sm">
                    Reject
                  </Button>
                }
                title="Reject this withdrawal request?"
                description="This is terminal — the requester will need to submit a new request if funds are still needed."
                submitLabel="Reject"
                submitVariant="danger"
                onSubmit={async (formData) => {
                  await decideApprovalQueueAction(
                    request.withdrawalRequestId,
                    "REJECTED",
                    String(formData.get("comment") ?? "") || undefined,
                  );
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`reject-comment-${request.withdrawalRequestId}`}>Comment (optional)</Label>
                  <Textarea id={`reject-comment-${request.withdrawalRequestId}`} name="comment" rows={2} />
                </div>
              </EditDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
