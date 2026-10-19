import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { WalletTransaction } from "@/models";
import type { WalletDirection, WalletTransactionSourceType, WalletType } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { findWallet } from "@/lib/wallets/ledger";
import type { SessionUser } from "@/lib/permissions/roles";

export class WalletError extends Error {}

export interface WalletScope {
  walletType: WalletType;
  facultyId?: string;
  departmentId?: string;
}

function scopeEntityId(scope: WalletScope): string {
  const id = scope.walletType === "FACULTY" ? scope.facultyId : scope.departmentId;
  if (!id) {
    throw new WalletError(scope.walletType === "FACULTY" ? "A faculty is required." : "A department is required.");
  }
  return id;
}

function viewCapability(walletType: WalletType): "faculty-dashboard:view" | "department-dashboard:view" {
  return walletType === "FACULTY" ? "faculty-dashboard:view" : "department-dashboard:view";
}

export interface WalletTransactionSummary {
  walletTransactionId: string;
  direction: WalletDirection;
  amountPesewas: number;
  balanceAfterPesewas: number;
  sourceType: WalletTransactionSourceType;
  description: string | null;
  createdAt: Date;
}


export async function listWalletTransactions(
  actor: SessionUser,
  organizationId: string,
  scope: WalletScope,
  options: { limit?: number } = {},
): Promise<WalletTransactionSummary[]> {
  assertCan(actor, viewCapability(scope.walletType), {
    organizationId,
    facultyId: scope.facultyId,
    departmentId: scope.departmentId,
  });
  await connectToDatabase();

  const entityId = scopeEntityId(scope);
  const wallet = await findWallet(scope.walletType, organizationId, entityId);
  if (!wallet) return [];

  const transactions = await WalletTransaction.find({
    walletType: scope.walletType,
    walletId: wallet._id,
  })
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 50);

  return transactions.map((transaction) => ({
    walletTransactionId: transaction._id.toString(),
    direction: transaction.direction,
    amountPesewas: transaction.amountPesewas,
    balanceAfterPesewas: transaction.balanceAfterPesewas,
    sourceType: transaction.sourceType,
    description: transaction.description ?? null,
    createdAt: transaction.createdAt,
  }));
}

