import "@/lib/serverOnly";
import { Types } from "mongoose";
import { FacultyWallet, DepartmentWallet, WalletTransaction } from "@/models";
import type { WalletTransactionSourceType, WalletType } from "@/models";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function creditWallet(
  walletType: WalletType,
  organizationId: Types.ObjectId | string,
  entityId: Types.ObjectId | string,
  amountPesewas: number,
  sourceType: WalletTransactionSourceType,
  sourceId: Types.ObjectId | string,
  description: string,
): Promise<void> {
  if (amountPesewas <= 0) return;

  const WalletModel = walletType === "FACULTY" ? FacultyWallet : DepartmentWallet;
  const walletIdField = walletType === "FACULTY" ? "facultyId" : "departmentId";

  const wallet = await WalletModel.findOneAndUpdate(
    { organizationId, [walletIdField]: entityId },
    {
      $setOnInsert: {
        organizationId,
        [walletIdField]: entityId,
        balancePesewas: 0,
        totalCreditedPesewas: 0,
        totalDebitedPesewas: 0,
      },
    },
    { upsert: true, new: true },
  );

  try {
    await WalletTransaction.create({
      organizationId,
      walletType,
      walletId: wallet._id,
      direction: "CREDIT",
      amountPesewas,
      balanceAfterPesewas: wallet.balancePesewas + amountPesewas,
      sourceType,
      sourceId,
      description,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return; // already credited by an earlier attempt — no-op
    throw error;
  }

  await WalletModel.updateOne(
    { _id: wallet._id },
    { $inc: { balancePesewas: amountPesewas, totalCreditedPesewas: amountPesewas } },
  );
}

/** The mirror of `creditWallet`. */
export async function debitWallet(
  walletType: WalletType,
  organizationId: Types.ObjectId | string,
  entityId: Types.ObjectId | string,
  amountPesewas: number,
  sourceType: WalletTransactionSourceType,
  sourceId: Types.ObjectId | string,
  description: string,
): Promise<void> {
  if (amountPesewas <= 0) return;

  const WalletModel = walletType === "FACULTY" ? FacultyWallet : DepartmentWallet;
  const walletIdField = walletType === "FACULTY" ? "facultyId" : "departmentId";

  const wallet = await WalletModel.findOne({ organizationId, [walletIdField]: entityId });
  if (!wallet) return; // nothing was ever credited to this entity — nothing to reverse

  try {
    await WalletTransaction.create({
      organizationId,
      walletType,
      walletId: wallet._id,
      direction: "DEBIT",
      amountPesewas,
      balanceAfterPesewas: wallet.balancePesewas - amountPesewas,
      sourceType,
      sourceId,
      description,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return;
    throw error;
  }

  await WalletModel.updateOne(
    { _id: wallet._id },
    { $inc: { balancePesewas: -amountPesewas, totalDebitedPesewas: amountPesewas } },
  );
}

export async function recordWalletHold(
  walletType: WalletType,
  organizationId: Types.ObjectId | string,
  entityId: Types.ObjectId | string,
  amountPesewas: number,
  sourceId: Types.ObjectId | string,
  description: string,
): Promise<void> {
  if (amountPesewas <= 0) return;

  const WalletModel = walletType === "FACULTY" ? FacultyWallet : DepartmentWallet;
  const walletIdField = walletType === "FACULTY" ? "facultyId" : "departmentId";

  const wallet = await WalletModel.findOneAndUpdate(
    { organizationId, [walletIdField]: entityId },
    {
      $setOnInsert: {
        organizationId,
        [walletIdField]: entityId,
        balancePesewas: 0,
        totalCreditedPesewas: 0,
        totalDebitedPesewas: 0,
      },
    },
    { upsert: true, new: true },
  );

  try {
    await WalletTransaction.create({
      organizationId,
      walletType,
      walletId: wallet._id,
      direction: "HOLD",
      amountPesewas,
      balanceAfterPesewas: wallet.balancePesewas,
      sourceType: "WITHDRAWAL_HOLD",
      sourceId,
      description,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return; // already recorded — e.g. a resubmit after Return
    throw error;
  }
}

export async function computeLedgerBalance(
  walletType: WalletType,
  walletId: Types.ObjectId | string,
): Promise<number> {
  const result = await WalletTransaction.aggregate<{ total: number }>([
    {
      $match: {
        walletType,
        walletId: typeof walletId === "string" ? new Types.ObjectId(walletId) : walletId,
        direction: { $ne: "HOLD" },
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [{ $eq: ["$direction", "CREDIT"] }, "$amountPesewas", { $multiply: ["$amountPesewas", -1] }],
          },
        },
      },
    },
  ]);
  return result[0]?.total ?? 0;
}

export async function findWallet(
  walletType: WalletType,
  organizationId: Types.ObjectId | string,
  entityId: Types.ObjectId | string,
) {
  const WalletModel = walletType === "FACULTY" ? FacultyWallet : DepartmentWallet;
  const walletIdField = walletType === "FACULTY" ? "facultyId" : "departmentId";
  return WalletModel.findOne({ organizationId, [walletIdField]: entityId });
}
