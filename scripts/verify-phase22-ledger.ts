/**
 * Phase 22 — the Wallet & Settlement System's core invariants, exercised
 * directly against the ledger (no browser needed):
 *   - a revenue allocation credit is REVENUE_ALLOCATION/CREDIT, and
 *     computeLedgerBalance matches balancePesewas
 *   - submitting a withdrawal produces a WITHDRAWAL_HOLD/HOLD transaction
 *     that changes NOTHING about the real balance
 *   - Dean approval AND Super Admin approval both leave the balance
 *     untouched — "approval does NOT equal fund release"
 *   - releasing funds produces WITHDRAWAL_RELEASE/DEBIT and the balance
 *     drops by exactly the released amount
 *   - a rejected request's hold stays in the ledger, untouched, balance
 *     unaffected
 *   - adjustLedgerEntry tags its wallet transactions CORRECTION, not
 *     ADJUSTMENT
 * See ARCHITECTURE.md Phase 22.
 */
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import type { SessionUser } from "@/lib/permissions/roles";
import {
  Organization,
  Faculty,
  FacultyWallet,
  RevenueAllocation,
  WithdrawalRequest,
  WithdrawalApproval,
  WithdrawalSettlement,
  WalletTransaction,
  AuditLog,
} from "@/models";
import { creditWallet, computeLedgerBalance } from "@/lib/wallets/ledger";
import {
  createAndSubmitWithdrawalRequest,
  decideFirstStageApproval,
  decideSuperAdminApproval,
  releaseWithdrawalFunds,
} from "@/services/withdrawal.service";
import { adjustLedgerEntry } from "@/services/revenue-allocation.service";

let failures = 0;
function check(label: string, pass: boolean, detail?: unknown): void {
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}`, detail !== undefined ? JSON.stringify(detail) : "");
  if (!pass) failures++;
}

async function main() {
  await connectToDatabase();
  const suffix = Date.now();

  const org = await Organization.create({
    name: "Phase22 Ledger Org",
    slug: `phase22-ledger-${suffix}`,
    contactEmail: `phase22-ledger-${suffix}@test-uni.example`,
  });
  const faculty = await Faculty.create({
    organizationId: org._id,
    name: "Phase22 Ledger Faculty",
    code: `P22L${suffix.toString().slice(-6)}`,
  });
  const wallet = await FacultyWallet.create({
    organizationId: org._id,
    facultyId: faculty._id,
    balancePesewas: 0,
    totalCreditedPesewas: 0,
    totalDebitedPesewas: 0,
  });

  const organizationId = org._id.toString();
  const facultyId = faculty._id.toString();

  const treasurer: SessionUser = {
    userId: new Types.ObjectId().toString(),
    role: "FACULTY_TREASURER",
    organizationId,
    facultyId,
  };
  const dean: SessionUser = {
    userId: new Types.ObjectId().toString(),
    role: "FACULTY_DEAN",
    organizationId,
    facultyId,
  };
  const superAdmin: SessionUser = { userId: new Types.ObjectId().toString(), role: "SUPER_ADMIN" };
  const orgAdmin: SessionUser = { userId: new Types.ObjectId().toString(), role: "ORG_ADMIN", organizationId };

  const destinationInput = {
    destinationMethod: "BANK_TRANSFER" as const,
    destinationAccountName: "Verify Account",
    destinationAccountNumber: "0011223344",
    destinationProvider: "Verify Bank",
  };

  try {
    // ================= Revenue allocation credit =================
    const revenueSourceId = new Types.ObjectId();
    await creditWallet(
      "FACULTY",
      org._id,
      faculty._id,
      100_000,
      "REVENUE_ALLOCATION",
      revenueSourceId,
      "Phase22 test revenue allocation",
    );

    let walletDoc = await FacultyWallet.findById(wallet._id);
    check("Revenue allocation credited the wallet balance to 100,000", walletDoc?.balancePesewas === 100_000);
    let ledgerBalance = await computeLedgerBalance("FACULTY", wallet._id);
    check("computeLedgerBalance matches balancePesewas after the credit", ledgerBalance === walletDoc?.balancePesewas, ledgerBalance);

    const revenueTxn = await WalletTransaction.findOne({ walletId: wallet._id, sourceId: revenueSourceId });
    check(
      "Revenue allocation is tagged REVENUE_ALLOCATION/CREDIT",
      revenueTxn?.sourceType === "REVENUE_ALLOCATION" && revenueTxn?.direction === "CREDIT",
    );

    // ================= Withdrawal hold — approval ≠ release =================
    const releasedReqId = await createAndSubmitWithdrawalRequest(
      treasurer,
      organizationId,
      { walletType: "FACULTY", facultyId },
      { amountPesewas: 30_000, reason: "Phase22 Ledger Release Test", ...destinationInput },
    );

    walletDoc = await FacultyWallet.findById(wallet._id);
    check("Balance is unchanged immediately after submit (hold, not debit)", walletDoc?.balancePesewas === 100_000);

    const holdTxn = await WalletTransaction.findOne({ walletId: wallet._id, sourceId: releasedReqId });
    check(
      "A WITHDRAWAL_HOLD/HOLD transaction was recorded for the submitted request",
      holdTxn?.sourceType === "WITHDRAWAL_HOLD" && holdTxn?.direction === "HOLD",
    );
    check(
      "The hold's balanceAfterPesewas equals the balance before it (never moved)",
      holdTxn?.balanceAfterPesewas === 100_000,
    );

    ledgerBalance = await computeLedgerBalance("FACULTY", wallet._id);
    check("computeLedgerBalance still matches balancePesewas after the hold (HOLD excluded)", ledgerBalance === 100_000, ledgerBalance);

    await decideFirstStageApproval(dean, organizationId, releasedReqId, { decision: "APPROVED" });
    walletDoc = await FacultyWallet.findById(wallet._id);
    check("Balance is unchanged after Dean approval (approval ≠ release)", walletDoc?.balancePesewas === 100_000);

    await decideSuperAdminApproval(superAdmin, null, releasedReqId, { decision: "APPROVED" });
    walletDoc = await FacultyWallet.findById(wallet._id);
    check("Balance is unchanged after Super Admin approval (approval ≠ release)", walletDoc?.balancePesewas === 100_000);

    // ================= Withdrawal release — the only thing that decreases the balance =================
    await releaseWithdrawalFunds(superAdmin, null, releasedReqId, {
      method: "BANK_TRANSFER",
      reference: `PHASE22-REF-${suffix}`,
    });

    walletDoc = await FacultyWallet.findById(wallet._id);
    check("Balance dropped by exactly the released amount (100,000 - 30,000)", walletDoc?.balancePesewas === 70_000, walletDoc?.balancePesewas);

    const releaseTxn = await WalletTransaction.findOne({ walletId: wallet._id, sourceId: releasedReqId, sourceType: "WITHDRAWAL_RELEASE" });
    check(
      "A WITHDRAWAL_RELEASE/DEBIT transaction was recorded on release",
      releaseTxn?.sourceType === "WITHDRAWAL_RELEASE" && releaseTxn?.direction === "DEBIT",
    );

    ledgerBalance = await computeLedgerBalance("FACULTY", wallet._id);
    check("computeLedgerBalance matches balancePesewas after the release", ledgerBalance === 70_000, ledgerBalance);

    // ================= Rejected request: hold stays in the ledger, balance unaffected =================
    const rejectedReqId = await createAndSubmitWithdrawalRequest(
      treasurer,
      organizationId,
      { walletType: "FACULTY", facultyId },
      { amountPesewas: 20_000, reason: "Phase22 Ledger Reject Test", ...destinationInput },
    );
    await decideFirstStageApproval(dean, organizationId, rejectedReqId, { decision: "REJECTED" });

    walletDoc = await FacultyWallet.findById(wallet._id);
    check("Balance is unaffected by a rejected request", walletDoc?.balancePesewas === 70_000);
    const rejectedHoldTxn = await WalletTransaction.findOne({ walletId: wallet._id, sourceId: rejectedReqId });
    check(
      "The rejected request's hold transaction remains in the ledger, untouched",
      rejectedHoldTxn?.sourceType === "WITHDRAWAL_HOLD" && rejectedHoldTxn?.direction === "HOLD",
    );

    // ================= Correction (not Adjustment) =================
    const fakePayment = {
      _id: new Types.ObjectId(),
      paymentPeriodId: new Types.ObjectId(),
      ruleId: new Types.ObjectId(),
    };
    const allocation = await RevenueAllocation.create({
      organizationId: org._id,
      paymentId: fakePayment._id,
      studentIndexNumber: "PHASE22-STUDENT-1",
      facultyId: faculty._id,
      facultyName: faculty.name,
      paymentPeriodId: fakePayment.paymentPeriodId,
      paymentPeriodName: "Phase22 Test Period",
      totalAmountPesewas: 20_000,
      facultyShareAmountPesewas: 10_000,
      departmentShareAmountPesewas: 10_000,
      deductionsTotalPesewas: 0,
      ruleId: fakePayment.ruleId,
      ruleNameSnapshot: "Phase22 Test Rule",
      status: "ALLOCATED",
    });

    await adjustLedgerEntry(orgAdmin, organizationId, allocation._id.toString(), {
      newFacultyShareAmountPesewas: 15_000, // +5,000 delta
      reason: "Phase22 correction test",
    });

    const correctionEntry = await RevenueAllocation.findOne({ adjustsEntryId: allocation._id });
    const correctionTxn = await WalletTransaction.findOne({
      walletId: wallet._id,
      sourceId: correctionEntry?._id,
    });
    check(
      "adjustLedgerEntry's wallet transaction is tagged CORRECTION, not ADJUSTMENT",
      correctionTxn?.sourceType === "CORRECTION" && correctionTxn?.direction === "CREDIT",
      correctionTxn?.sourceType,
    );

    walletDoc = await FacultyWallet.findById(wallet._id);
    check("Correction credited the wallet by the +5,000 delta (70,000 -> 75,000)", walletDoc?.balancePesewas === 75_000, walletDoc?.balancePesewas);
    ledgerBalance = await computeLedgerBalance("FACULTY", wallet._id);
    check("computeLedgerBalance matches balancePesewas after the correction", ledgerBalance === 75_000, ledgerBalance);
  } catch (error) {
    console.error("Script error:", error);
    failures++;
  } finally {
    const requestIds = await WithdrawalRequest.find({ organizationId: org._id }).distinct("_id");
    await WithdrawalSettlement.deleteMany({ withdrawalRequestId: { $in: requestIds } });
    await WithdrawalApproval.deleteMany({ withdrawalRequestId: { $in: requestIds } });
    await AuditLog.deleteMany({
      targetType: { $in: ["WithdrawalRequest", "RevenueAllocation"] },
      organizationId: org._id.toString(),
    });
    await WithdrawalRequest.deleteMany({ organizationId: org._id });
    await WalletTransaction.deleteMany({ walletId: wallet._id });
    await RevenueAllocation.deleteMany({ organizationId: org._id });
    await FacultyWallet.deleteOne({ _id: wallet._id });
    await Faculty.deleteOne({ _id: faculty._id });
    await Organization.deleteOne({ _id: org._id });
  }

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
