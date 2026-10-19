import "@/lib/serverOnly";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import {
  WithdrawalRequest,
  WithdrawalApproval,
  WithdrawalSettlement,
  AuditLog,
} from "@/models";
import type {
  WalletType,
  WithdrawalRequestStatus,
  WithdrawalDestinationMethod,
  WithdrawalDecision,
  SettlementMethod,
} from "@/models";
import { assertCan, can } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { debitWallet, findWallet, recordWalletHold } from "@/lib/wallets/ledger";
import { getPlatformSettings } from "@/services/platform.service";
import type { SessionUser } from "@/lib/permissions/roles";

export class WithdrawalError extends Error {}

async function assertNotSelfApproval(actor: SessionUser, requestedById: Types.ObjectId): Promise<void> {
  if (requestedById.toString() !== actor.userId) return;
  const settings = await getPlatformSettings();
  if (!settings.allowWithdrawalSelfApproval) {
    throw new WithdrawalError("You cannot approve your own withdrawal request.");
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

const ALLOWED_TRANSITIONS: Record<WithdrawalRequestStatus, WithdrawalRequestStatus[]> = {
  DRAFT: ["PENDING_DEAN_APPROVAL", "CANCELLED"],
  PENDING_DEAN_APPROVAL: ["DEAN_APPROVED", "DEAN_REJECTED", "RETURNED_FOR_CORRECTION", "CANCELLED"],
  RETURNED_FOR_CORRECTION: ["PENDING_DEAN_APPROVAL", "CANCELLED"],
  DEAN_APPROVED: ["PENDING_SUPER_ADMIN_APPROVAL"],
  DEAN_REJECTED: [],
  PENDING_SUPER_ADMIN_APPROVAL: ["SUPER_ADMIN_APPROVED", "REJECTED", "CANCELLED"],
  SUPER_ADMIN_APPROVED: ["RELEASED", "CANCELLED"],
  RELEASED: [],
  REJECTED: [],
  CANCELLED: [],
};

const ENCUMBERING_STATUSES: WithdrawalRequestStatus[] = [
  "PENDING_DEAN_APPROVAL",
  "RETURNED_FOR_CORRECTION",
  "PENDING_SUPER_ADMIN_APPROVAL",
  "SUPER_ADMIN_APPROVED",
];

const EDITABLE_STATUSES: WithdrawalRequestStatus[] = ["DRAFT", "RETURNED_FOR_CORRECTION"];

const CANCELLABLE_STATUSES: WithdrawalRequestStatus[] = [
  "DRAFT",
  "PENDING_DEAN_APPROVAL",
  "RETURNED_FOR_CORRECTION",
  "PENDING_SUPER_ADMIN_APPROVAL",
  "SUPER_ADMIN_APPROVED",
];

function assertTransition(from: WithdrawalRequestStatus, to: WithdrawalRequestStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new WithdrawalError(`Cannot move a withdrawal request from ${from} to ${to}.`);
  }
}

export interface WalletScope {
  walletType: WalletType;
  facultyId?: string;
  departmentId?: string;
}

function scopeEntityId(scope: WalletScope): string {
  const id = scope.walletType === "FACULTY" ? scope.facultyId : scope.departmentId;
  if (!id) {
    throw new WithdrawalError(
      scope.walletType === "FACULTY" ? "A faculty is required." : "A department is required.",
    );
  }
  return id;
}

function scopeFromRequest(request: {
  walletType: WalletType;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
}): WalletScope {
  return {
    walletType: request.walletType,
    facultyId: request.facultyId?.toString(),
    departmentId: request.departmentId?.toString(),
  };
}

function viewCapability(walletType: WalletType): "faculty-dashboard:view" | "department-dashboard:view" {
  return walletType === "FACULTY" ? "faculty-dashboard:view" : "department-dashboard:view";
}

async function sumEncumbered(
  walletType: WalletType,
  walletId: Types.ObjectId | string,
  excludeRequestId?: string,
): Promise<number> {
  const match: Record<string, unknown> = {
    walletType,
    walletId: typeof walletId === "string" ? new Types.ObjectId(walletId) : walletId,
    status: { $in: ENCUMBERING_STATUSES },
  };
  if (excludeRequestId) match._id = { $ne: new Types.ObjectId(excludeRequestId) };

  const result = await WithdrawalRequest.aggregate<{ total: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amountPesewas" } } },
  ]);
  return result[0]?.total ?? 0;
}

export interface AvailableBalance {
  walletId: string | null;
  balancePesewas: number;
  availablePesewas: number;
}

export async function getAvailableBalance(
  organizationId: string,
  scope: WalletScope,
  excludeRequestId?: string,
): Promise<AvailableBalance> {
  await connectToDatabase();
  const entityId = scopeEntityId(scope);
  const wallet = await findWallet(scope.walletType, organizationId, entityId);
  if (!wallet) return { walletId: null, balancePesewas: 0, availablePesewas: 0 };

  const encumbered = await sumEncumbered(scope.walletType, wallet._id, excludeRequestId);
  return {
    walletId: wallet._id.toString(),
    balancePesewas: wallet.balancePesewas,
    availablePesewas: wallet.balancePesewas - encumbered,
  };
}

export interface WithdrawalRequestInput {
  amountPesewas: number;
  reason: string;
  destinationMethod: WithdrawalDestinationMethod;
  destinationAccountName: string;
  destinationAccountNumber: string;
  destinationProvider: string;
}

function validateInput(input: WithdrawalRequestInput): void {
  if (!Number.isFinite(input.amountPesewas) || input.amountPesewas <= 0) {
    throw new WithdrawalError("The amount must be greater than zero.");
  }
  if (!input.reason.trim()) {
    throw new WithdrawalError("A reason is required.");
  }
  if (
    !input.destinationAccountName.trim() ||
    !input.destinationAccountNumber.trim() ||
    !input.destinationProvider.trim()
  ) {
    throw new WithdrawalError("Destination account name, number, and bank/provider are all required.");
  }
}

export async function createDraftWithdrawalRequest(
  actor: SessionUser,
  organizationId: string,
  scope: WalletScope,
  input: WithdrawalRequestInput,
): Promise<string> {
  assertCan(actor, "withdrawal:request", {
    organizationId,
    facultyId: scope.facultyId,
    departmentId: scope.departmentId,
  });
  await connectToDatabase();
  validateInput(input);

  const { availablePesewas } = await getAvailableBalance(organizationId, scope);
  if (input.amountPesewas > availablePesewas) {
    throw new WithdrawalError(`This exceeds the available balance (${availablePesewas} pesewas).`);
  }

  const entityId = scopeEntityId(scope);
  const wallet = await findWallet(scope.walletType, organizationId, entityId);
  if (!wallet) {
    throw new WithdrawalError("No wallet balance is available to withdraw from.");
  }

  const request = await WithdrawalRequest.create({
    organizationId,
    walletType: scope.walletType,
    walletId: wallet._id,
    facultyId: scope.walletType === "FACULTY" ? entityId : undefined,
    departmentId: scope.walletType === "DEPARTMENT" ? entityId : undefined,
    requestedById: actor.userId,
    amountPesewas: input.amountPesewas,
    reason: input.reason.trim(),
    destinationMethod: input.destinationMethod,
    destinationAccountName: input.destinationAccountName.trim(),
    destinationAccountNumber: input.destinationAccountNumber.trim(),
    destinationProvider: input.destinationProvider.trim(),
    status: "DRAFT",
  });

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "withdrawal.created",
    targetType: "WithdrawalRequest",
    targetId: request._id.toString(),
    metadata: { toStatus: "DRAFT", amountPesewas: input.amountPesewas },
  });

  return request._id.toString();
}

async function loadOwnedRequest(organizationId: string | null, requestId: string) {
  const query: Record<string, unknown> = { _id: requestId };
  if (organizationId) query.organizationId = organizationId;
  const request = await WithdrawalRequest.findOne(query);
  if (!request) {
    throw new WithdrawalError("Withdrawal request not found.");
  }
  return request;
}

export async function updateDraftWithdrawalRequest(
  actor: SessionUser,
  organizationId: string,
  requestId: string,
  input: WithdrawalRequestInput,
): Promise<void> {
  await connectToDatabase();
  const current = await loadOwnedRequest(organizationId, requestId);
  assertCan(actor, "withdrawal:request", { organizationId, ...scopeFromRequest(current) });

  if (!EDITABLE_STATUSES.includes(current.status)) {
    throw new WithdrawalError(`Cannot edit a request that is ${current.status}.`);
  }
  validateInput(input);

  const { availablePesewas } = await getAvailableBalance(
    organizationId,
    scopeFromRequest(current),
    requestId,
  );
  if (input.amountPesewas > availablePesewas) {
    throw new WithdrawalError(`This exceeds the available balance (${availablePesewas} pesewas).`);
  }

  await WithdrawalRequest.updateOne(
    { _id: requestId },
    {
      $set: {
        amountPesewas: input.amountPesewas,
        reason: input.reason.trim(),
        destinationMethod: input.destinationMethod,
        destinationAccountName: input.destinationAccountName.trim(),
        destinationAccountNumber: input.destinationAccountNumber.trim(),
        destinationProvider: input.destinationProvider.trim(),
      },
    },
  );
}

export async function submitWithdrawalRequest(
  actor: SessionUser,
  organizationId: string,
  requestId: string,
): Promise<void> {
  await connectToDatabase();
  const current = await loadOwnedRequest(organizationId, requestId);
  assertCan(actor, "withdrawal:request", { organizationId, ...scopeFromRequest(current) });
  assertTransition(current.status, "PENDING_DEAN_APPROVAL");

  const { availablePesewas } = await getAvailableBalance(
    organizationId,
    scopeFromRequest(current),
    requestId,
  );
  if (current.amountPesewas > availablePesewas) {
    throw new WithdrawalError(
      `This exceeds the available balance (${availablePesewas} pesewas) — edit the amount before submitting.`,
    );
  }

  const updated = await WithdrawalRequest.findOneAndUpdate(
    { _id: requestId, status: current.status },
    { $set: { status: "PENDING_DEAN_APPROVAL" }, $unset: { correctionNote: "" } },
  );
  if (!updated) {
    throw new WithdrawalError("This request was already changed by another action.");
  }

  // Records that this amount is now held — never moves balancePesewas. See
  // recordWalletHold's own doc comment and ARCHITECTURE.md Phase 22.
  await recordWalletHold(
    current.walletType,
    organizationId,
    scopeEntityId(scopeFromRequest(current)),
    current.amountPesewas,
    current._id,
    `Withdrawal hold for request ${current._id.toString()}`,
  );

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "withdrawal.submitted",
    targetType: "WithdrawalRequest",
    targetId: requestId,
    metadata: { fromStatus: current.status, toStatus: "PENDING_DEAN_APPROVAL" },
  });
}

/** Convenience used by Department's single-step "Request withdrawal" UI (Phase 16) and Faculty's "Save & Submit" button — create then immediately submit. */
export async function createAndSubmitWithdrawalRequest(
  actor: SessionUser,
  organizationId: string,
  scope: WalletScope,
  input: WithdrawalRequestInput,
): Promise<string> {
  const requestId = await createDraftWithdrawalRequest(actor, organizationId, scope, input);
  await submitWithdrawalRequest(actor, organizationId, requestId);
  return requestId;
}

export async function cancelWithdrawalRequest(
  actor: SessionUser,
  organizationId: string,
  requestId: string,
): Promise<void> {
  await connectToDatabase();
  const current = await loadOwnedRequest(organizationId, requestId);
  assertCan(actor, "withdrawal:request", { organizationId, ...scopeFromRequest(current) });

  if (!CANCELLABLE_STATUSES.includes(current.status)) {
    throw new WithdrawalError(`Cannot cancel a request that is ${current.status}.`);
  }
  assertTransition(current.status, "CANCELLED");

  const updated = await WithdrawalRequest.findOneAndUpdate(
    { _id: requestId, status: current.status },
    { $set: { status: "CANCELLED" } },
  );
  if (!updated) {
    throw new WithdrawalError("This request was already changed by another action.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "withdrawal.cancelled",
    targetType: "WithdrawalRequest",
    targetId: requestId,
    metadata: { fromStatus: current.status, toStatus: "CANCELLED" },
  });
}

export interface DecideFirstStageInput {
  decision: WithdrawalDecision;
  comment?: string;
}

export async function decideFirstStageApproval(
  actor: SessionUser,
  organizationId: string,
  requestId: string,
  input: DecideFirstStageInput,
): Promise<void> {
  await connectToDatabase();
  const current = await loadOwnedRequest(organizationId, requestId);
  assertCan(actor, "withdrawal:approve", { organizationId, ...scopeFromRequest(current) });
  await assertNotSelfApproval(actor, current.requestedById);

  if (current.status !== "PENDING_DEAN_APPROVAL") {
    throw new WithdrawalError(`Cannot decide on a request that is ${current.status}.`);
  }
  if (input.decision === "RETURNED" && !input.comment?.trim()) {
    throw new WithdrawalError("A note is required when returning a request for correction.");
  }

  if (input.decision === "APPROVED") {
    assertTransition(current.status, "DEAN_APPROVED");
    const step1 = await WithdrawalRequest.findOneAndUpdate(
      { _id: requestId, status: "PENDING_DEAN_APPROVAL" },
      { $set: { status: "DEAN_APPROVED" } },
    );
    if (!step1) throw new WithdrawalError("This request was already decided by another action.");
    await recordAudit({
      organizationId,
      actorId: actor.userId,
      actorRoleSnapshot: actor.role,
      action: "withdrawal.first_stage_decided",
      targetType: "WithdrawalRequest",
      targetId: requestId,
      metadata: { decision: "APPROVED", fromStatus: "PENDING_DEAN_APPROVAL", toStatus: "DEAN_APPROVED" },
    });

    assertTransition("DEAN_APPROVED", "PENDING_SUPER_ADMIN_APPROVAL");
    await WithdrawalRequest.updateOne(
      { _id: requestId },
      { $set: { status: "PENDING_SUPER_ADMIN_APPROVAL" } },
    );
    await recordAudit({
      organizationId,
      actorId: actor.userId,
      actorRoleSnapshot: actor.role,
      action: "withdrawal.escalated_to_super_admin",
      targetType: "WithdrawalRequest",
      targetId: requestId,
      metadata: { fromStatus: "DEAN_APPROVED", toStatus: "PENDING_SUPER_ADMIN_APPROVAL" },
    });
  } else {
    const nextStatus: WithdrawalRequestStatus =
      input.decision === "REJECTED" ? "DEAN_REJECTED" : "RETURNED_FOR_CORRECTION";
    assertTransition(current.status, nextStatus);

    const updated = await WithdrawalRequest.findOneAndUpdate(
      { _id: requestId, status: "PENDING_DEAN_APPROVAL" },
      {
        $set: {
          status: nextStatus,
          ...(input.decision === "RETURNED" ? { correctionNote: input.comment!.trim() } : {}),
        },
      },
    );
    if (!updated) throw new WithdrawalError("This request was already decided by another action.");

    await recordAudit({
      organizationId,
      actorId: actor.userId,
      actorRoleSnapshot: actor.role,
      action: "withdrawal.first_stage_decided",
      targetType: "WithdrawalRequest",
      targetId: requestId,
      metadata: {
        decision: input.decision,
        fromStatus: "PENDING_DEAN_APPROVAL",
        toStatus: nextStatus,
        comment: input.comment,
      },
    });
  }

  await WithdrawalApproval.create({
    withdrawalRequestId: requestId,
    stage: "FIRST",
    approverId: actor.userId,
    approverRoleSnapshot: actor.role,
    decision: input.decision,
    comment: input.comment?.trim() || undefined,
  });
}

export interface DecideSuperAdminInput {
  decision: "APPROVED" | "REJECTED";
  comment?: string;
}

export async function decideSuperAdminApproval(
  actor: SessionUser,
  organizationId: string | null,
  requestId: string,
  input: DecideSuperAdminInput,
): Promise<void> {
  assertCan(actor, "withdrawal:super-approve");
  await connectToDatabase();

  const current = await loadOwnedRequest(organizationId, requestId);
  const requestOrgId = current.organizationId.toString();
  await assertNotSelfApproval(actor, current.requestedById);
  if (current.status !== "PENDING_SUPER_ADMIN_APPROVAL") {
    throw new WithdrawalError(`Cannot decide on a request that is ${current.status}.`);
  }

  const nextStatus: WithdrawalRequestStatus =
    input.decision === "APPROVED" ? "SUPER_ADMIN_APPROVED" : "REJECTED";
  assertTransition(current.status, nextStatus);

  const updated = await WithdrawalRequest.findOneAndUpdate(
    { _id: requestId, status: "PENDING_SUPER_ADMIN_APPROVAL" },
    { $set: { status: nextStatus } },
  );
  if (!updated) throw new WithdrawalError("This request was already decided by another action.");

  await WithdrawalApproval.create({
    withdrawalRequestId: requestId,
    stage: "SUPER_ADMIN",
    approverId: actor.userId,
    approverRoleSnapshot: actor.role,
    decision: input.decision,
    comment: input.comment?.trim() || undefined,
  });

  await recordAudit({
    organizationId: requestOrgId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "withdrawal.super_admin_decided",
    targetType: "WithdrawalRequest",
    targetId: requestId,
    metadata: {
      decision: input.decision,
      fromStatus: "PENDING_SUPER_ADMIN_APPROVAL",
      toStatus: nextStatus,
      comment: input.comment,
    },
  });
}

export interface ReleaseFundsInput {
  method: SettlementMethod;
  reference: string;
  proofUrl?: string;
}

export async function releaseWithdrawalFunds(
  actor: SessionUser,
  organizationId: string | null,
  requestId: string,
  input: ReleaseFundsInput,
): Promise<void> {
  assertCan(actor, "funds:release");
  await connectToDatabase();

  const current = await loadOwnedRequest(organizationId, requestId);
  const requestOrgId = current.organizationId.toString();
  if (current.status !== "SUPER_ADMIN_APPROVED") {
    throw new WithdrawalError(`Cannot release a request that is ${current.status}.`);
  }
  assertTransition(current.status, "RELEASED");
  if (!input.reference.trim()) {
    throw new WithdrawalError("A settlement reference is required.");
  }

  const entityId = scopeEntityId(scopeFromRequest(current));
  const wallet = await findWallet(current.walletType, requestOrgId, entityId);
  if (!wallet || wallet.balancePesewas < current.amountPesewas) {
    throw new WithdrawalError("Insufficient wallet balance to release this withdrawal.");
  }

  const updated = await WithdrawalRequest.findOneAndUpdate(
    { _id: requestId, status: "SUPER_ADMIN_APPROVED" },
    { $set: { status: "RELEASED" } },
  );
  if (!updated) {
    throw new WithdrawalError("This request was already released or changed by another action.");
  }

  await debitWallet(
    current.walletType,
    requestOrgId,
    entityId,
    current.amountPesewas,
    "WITHDRAWAL_RELEASE",
    current._id,
    `Withdrawal release for request ${current._id.toString()}`,
  );

  try {
    await WithdrawalSettlement.create({
      withdrawalRequestId: requestId,
      settledById: actor.userId,
      method: input.method,
      reference: input.reference.trim(),
      amountPesewas: current.amountPesewas,
      proofUrl: input.proofUrl?.trim() || undefined,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error; // already settled by an earlier attempt
  }

  await recordAudit({
    organizationId: requestOrgId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "withdrawal.released",
    targetType: "WithdrawalRequest",
    targetId: requestId,
    metadata: {
      fromStatus: "SUPER_ADMIN_APPROVED",
      toStatus: "RELEASED",
      amountPesewas: current.amountPesewas,
      method: input.method,
      reference: input.reference,
    },
  });
}

export interface WithdrawalRequestSummary {
  withdrawalRequestId: string;
  walletType: WalletType;
  facultyId: string | null;
  departmentId: string | null;
  amountPesewas: number;
  reason: string;
  destinationMethod: WithdrawalDestinationMethod;
  destinationAccountName: string;
  destinationAccountNumber: string;
  destinationProvider: string;
  status: WithdrawalRequestStatus;
  correctionNote: string | null;
  requestedByName: string | null;
  organizationName: string | null;
  facultyName: string | null;
  departmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The populated-document type Mongoose infers from a multi-key
 * `.populate<T>([...])` call doesn't structurally match a hand-written
 * parameter type (the same Mongoose/TS limitation `dues-configuration.service.ts`
 * and `scoped-activation.ts` already work around) — every field read below
 * is genuinely present at runtime. The parameter is `any` with this comment
 * explaining why; the *return* type stays strictly `WithdrawalRequestSummary`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSummary(request: any): WithdrawalRequestSummary {
  const facultyDoc = request.facultyId as unknown as { _id?: { toString(): string }; name?: string } | null;
  const departmentDoc = request.departmentId as unknown as
    | { _id?: { toString(): string }; name?: string }
    | null;
  return {
    withdrawalRequestId: request._id.toString(),
    walletType: request.walletType,
    facultyId: facultyDoc?._id ? facultyDoc._id.toString() : (request.facultyId?.toString() ?? null),
    departmentId: departmentDoc?._id
      ? departmentDoc._id.toString()
      : (request.departmentId?.toString() ?? null),
    amountPesewas: request.amountPesewas,
    reason: request.reason,
    destinationMethod: request.destinationMethod,
    destinationAccountName: request.destinationAccountName,
    destinationAccountNumber: request.destinationAccountNumber,
    destinationProvider: request.destinationProvider,
    status: request.status,
    correctionNote: request.correctionNote ?? null,
    requestedByName: request.requestedById?.fullName ?? null,
    organizationName: request.organizationId?.name ?? null,
    facultyName: facultyDoc?.name ?? null,
    departmentName: departmentDoc?.name ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export interface ListWithdrawalRequestsFilters {
  status?: WithdrawalRequestStatus;
}

export async function listWithdrawalRequests(
  actor: SessionUser,
  organizationId: string,
  scope: WalletScope,
  filters: ListWithdrawalRequestsFilters = {},
): Promise<WithdrawalRequestSummary[]> {
  assertCan(actor, viewCapability(scope.walletType), {
    organizationId,
    facultyId: scope.facultyId,
    departmentId: scope.departmentId,
  });
  await connectToDatabase();

  const query: Record<string, unknown> = {
    organizationId,
    walletType: scope.walletType,
    ...(scope.walletType === "FACULTY"
      ? { facultyId: scope.facultyId }
      : { departmentId: scope.departmentId }),
  };
  if (filters.status) query.status = filters.status;

  const requests = await WithdrawalRequest.find(query)
    .populate<{ requestedById: { fullName: string } | null }>("requestedById")
    .populate<{ organizationId: { name: string } }>("organizationId")
    .populate<{ facultyId: { name: string } | null }>("facultyId")
    .populate<{ departmentId: { name: string } | null }>("departmentId")
    .sort({ createdAt: -1 })
    .limit(50);

  return requests.map(toSummary);
}

export interface SuperAdminQueueFilters {
  status?: WithdrawalRequestStatus;
  organizationId?: string;
}

/** Cross-org — the Super Admin's queue, type-agnostic (Faculty and Department requests both surface here). */
export async function listSuperAdminWithdrawalQueue(
  actor: SessionUser,
  filters: SuperAdminQueueFilters = {},
): Promise<WithdrawalRequestSummary[]> {
  assertCan(actor, "withdrawal:super-approve");
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.organizationId) query.organizationId = filters.organizationId;

  const requests = await WithdrawalRequest.find(query)
    .populate<{ requestedById: { fullName: string } | null }>("requestedById")
    .populate<{ organizationId: { name: string } }>("organizationId")
    .populate<{ facultyId: { name: string } | null }>("facultyId")
    .populate<{ departmentId: { name: string } | null }>("departmentId")
    .sort({ createdAt: -1 })
    .limit(100);

  return requests.map(toSummary);
}

export interface WithdrawalApprovalRecord {
  stage: "FIRST" | "SUPER_ADMIN";
  decision: WithdrawalDecision;
  comment: string | null;
  approverName: string | null;
  approverRole: string;
  decidedAt: Date;
}

export interface WithdrawalHistoryEntry {
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorEmail: string | null;
  createdAt: Date;
}

export interface WithdrawalRequestDetails extends WithdrawalRequestSummary {
  approvals: WithdrawalApprovalRecord[];
  history: WithdrawalHistoryEntry[];
  settlement: {
    method: SettlementMethod;
    reference: string;
    settledAt: Date;
    proofUrl: string | null;
  } | null;
}

/** Handles both a raw ObjectId (unpopulated field) and a populated subdocument (which carries its id on `_id`, not the whole object). */
function idFromMaybePopulated(value: unknown): string | undefined {
  if (value == null) return undefined;
  const withId = value as { _id?: { toString(): string } };
  if (withId._id) return withId._id.toString();
  return (value as { toString(): string }).toString();
}

/**
 * `organizationId` is optional — the Super Admin queue is cross-org
 * (`withdrawal:super-approve` carries no org scoping), so it looks up a
 * request by id alone and derives the owning org from the populated
 * document instead. Every other caller passes its own org id, which is
 * enforced as a query filter as before.
 */
export async function getWithdrawalRequestDetails(
  actor: SessionUser,
  organizationId: string | null,
  requestId: string,
): Promise<WithdrawalRequestDetails> {
  await connectToDatabase();

  const query: Record<string, unknown> = { _id: requestId };
  if (organizationId) query.organizationId = organizationId;

  const request = await WithdrawalRequest.findOne(query)
    .populate<{ requestedById: { fullName: string } | null }>("requestedById")
    .populate<{ organizationId: { name: string } }>("organizationId")
    .populate<{ facultyId: { name: string } | null }>("facultyId")
    .populate<{ departmentId: { name: string } | null }>("departmentId");
  if (!request) {
    throw new WithdrawalError("Withdrawal request not found.");
  }

  // request.facultyId/departmentId are populated docs here, not raw
  // ObjectIds — scopeFromRequest() assumes the latter, so the scope is
  // rebuilt explicitly rather than reused.
  const requestOrgId = idFromMaybePopulated(request.organizationId)!;
  const scope: WalletScope = {
    walletType: request.walletType,
    facultyId: idFromMaybePopulated(request.facultyId),
    departmentId: idFromMaybePopulated(request.departmentId),
  };
  const canView =
    can(actor, viewCapability(request.walletType), { organizationId: requestOrgId, ...scope }) ||
    can(actor, "withdrawal:super-approve");
  if (!canView) {
    throw new WithdrawalError("Not authorized to view this withdrawal request.");
  }

  const [approvals, auditLogs, settlement] = await Promise.all([
    WithdrawalApproval.find({ withdrawalRequestId: requestId })
      .populate<{ approverId: { fullName: string } | null }>("approverId")
      .sort({ decidedAt: 1 }),
    AuditLog.find({ targetType: "WithdrawalRequest", targetId: requestId })
      .populate<{ actorId?: { email: string } | null }>("actorId", "email")
      .sort({ createdAt: 1 }),
    WithdrawalSettlement.findOne({ withdrawalRequestId: requestId }),
  ]);

  return {
    ...toSummary(request),
    approvals: approvals.map((approval) => ({
      stage: approval.stage,
      decision: approval.decision,
      comment: approval.comment ?? null,
      approverName: approval.approverId?.fullName ?? null,
      approverRole: approval.approverRoleSnapshot,
      decidedAt: approval.decidedAt,
    })),
    history: auditLogs.map((log) => ({
      action: log.action,
      fromStatus: (log.metadata as { fromStatus?: string } | undefined)?.fromStatus ?? null,
      toStatus: (log.metadata as { toStatus?: string } | undefined)?.toStatus ?? null,
      actorEmail: log.actorId?.email ?? null,
      createdAt: log.createdAt,
    })),
    settlement: settlement
      ? {
          method: settlement.method,
          reference: settlement.reference,
          settledAt: settlement.settledAt,
          proofUrl: settlement.proofUrl ?? null,
        }
      : null,
  };
}
