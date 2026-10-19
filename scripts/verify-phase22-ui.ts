/**
 * Phase 22 — confirms the new "Wallet transactions" section actually
 * renders on the Faculty dashboard with correct type labels and
 * balance-after values for a Hold and a Release row. See ARCHITECTURE.md
 * Phase 22.
 */
import { chromium, type Page, type BrowserContext } from "playwright";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import { hashPassword } from "@/lib/auth/password";
import { ROLES } from "@/lib/permissions/roles";
import {
  Organization,
  Faculty,
  FacultyWallet,
  Role,
  User,
  UserRole,
  WithdrawalRequest,
  WithdrawalApproval,
  WithdrawalSettlement,
  WalletTransaction,
  AuditLog,
} from "@/models";

const BASE = "http://localhost:3000";
const PASSWORD = "Phase22-Verify-Pass1!";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL!;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD!;

let failures = 0;
function check(label: string, pass: boolean, detail?: unknown): void {
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}`, detail !== undefined ? JSON.stringify(detail) : "");
  if (!pass) failures++;
}

async function login(context: BrowserContext, email: string, password: string): Promise<Page> {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(faculty|super-admin|admin)/, { timeout: 15000 });
  return page;
}

async function main() {
  await connectToDatabase();
  const suffix = Date.now();

  const org = await Organization.create({
    name: "Phase22 UI Org",
    slug: `phase22-ui-${suffix}`,
    contactEmail: `phase22-ui-${suffix}@test-uni.example`,
  });
  const faculty = await Faculty.create({
    organizationId: org._id,
    name: "Phase22 UI Faculty",
    code: `P22U${suffix.toString().slice(-6)}`,
  });
  const wallet = await FacultyWallet.create({
    organizationId: org._id,
    facultyId: faculty._id,
    balancePesewas: 500_000,
    totalCreditedPesewas: 500_000,
    totalDebitedPesewas: 0,
  });

  const treasurerRole = await Role.findOne({ key: ROLES.FACULTY_TREASURER });
  const deanRole = await Role.findOne({ key: ROLES.FACULTY_DEAN });
  if (!treasurerRole || !deanRole) throw new Error("Role catalog missing required roles.");

  const passwordHash = await hashPassword(PASSWORD);
  const treasurerUser = await User.create({
    email: `phase22-treasurer-${suffix}@test-uni.example`,
    passwordHash,
    fullName: "Phase22 Treasurer",
    mustResetPassword: false,
  });
  const deanUser = await User.create({
    email: `phase22-dean-${suffix}@test-uni.example`,
    passwordHash,
    fullName: "Phase22 Dean",
    mustResetPassword: false,
  });
  await UserRole.create({
    userId: treasurerUser._id,
    roleId: treasurerRole._id,
    roleKey: ROLES.FACULTY_TREASURER,
    organizationId: org._id,
    facultyId: faculty._id,
    isActive: true,
  });
  await UserRole.create({
    userId: deanUser._id,
    roleId: deanRole._id,
    roleKey: ROLES.FACULTY_DEAN,
    organizationId: org._id,
    facultyId: faculty._id,
    isActive: true,
  });

  const facultyId = faculty._id.toString();
  const facultyUrl = `${BASE}/faculty/${facultyId}`;
  const browser = await chromium.launch();

  try {
    const treasurerCtx = await browser.newContext();
    let page = await login(treasurerCtx, treasurerUser.email, PASSWORD);
    await page.goto(facultyUrl);
    await page.click('button:has-text("New request")');
    const dialog = page.getByRole("dialog").filter({ hasText: "New withdrawal request" });
    await dialog.locator("#wr-amount").fill("400.00");
    await dialog.locator("#wr-reason").fill("Phase22 UI Test");
    await dialog.locator("#wr-destinationMethod").selectOption("BANK_TRANSFER");
    await dialog.locator("#wr-destinationProvider").fill("Verify Bank");
    await dialog.locator("#wr-destinationAccountName").fill("Verify Account");
    await dialog.locator("#wr-destinationAccountNumber").fill("0011223344");
    await dialog.getByRole("button", { name: "Save & submit" }).click();
    await page.waitForTimeout(1200);

    await page.goto(facultyUrl);
    let section = page.locator("h2:has-text('Wallet transactions')").locator("..");
    let sectionText = await section.innerText();
    check("Wallet transactions section shows the Withdrawal hold row", sectionText.includes("Withdrawal hold"));
    check("Hold row shows a Hold badge with balance-after '—'", /Hold[\s\S]*?—/.test(sectionText));
    await treasurerCtx.close();

    const deanCtx = await browser.newContext();
    page = await login(deanCtx, deanUser.email, PASSWORD);
    await page.goto(facultyUrl);
    const row = page.locator("tr", { has: page.locator('td:has-text("Phase22 UI Test")') });
    await row.locator('button:has-text("Approve")').click();
    await page.getByRole("dialog").filter({ hasText: "Approve this withdrawal request?" }).getByRole("button", { name: "Approve" }).click();
    await page.waitForTimeout(1200);
    await deanCtx.close();

    const superAdminCtx = await browser.newContext();
    page = await login(superAdminCtx, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    await page.goto(`${BASE}/super-admin/withdrawals`);
    const saRow = page.locator("tr", { has: page.locator('td:has-text("Phase22 UI Test")') });
    await saRow.locator('button:has-text("Approve")').click();
    await page.getByRole("dialog").filter({ hasText: "Approve this withdrawal request?" }).getByRole("button", { name: "Approve" }).click();
    await page.waitForTimeout(1200);

    await page.goto(`${BASE}/super-admin/withdrawals?status=SUPER_ADMIN_APPROVED`);
    const saRow2 = page.locator("tr", { has: page.locator('td:has-text("Phase22 UI Test")') });
    await saRow2.locator('button:has-text("Release funds")').click();
    const releaseDialog = page.getByRole("dialog").filter({ hasText: "Release withdrawal funds" });
    await releaseDialog.locator("#release-method").selectOption("BANK_TRANSFER");
    await releaseDialog.locator("#release-reference").fill(`PHASE22-UI-REF-${suffix}`);
    await releaseDialog.getByRole("button", { name: "Release funds" }).click();
    await page.waitForTimeout(1200);
    await superAdminCtx.close();

    const treasurerCtx2 = await browser.newContext();
    page = await login(treasurerCtx2, treasurerUser.email, PASSWORD);
    await page.goto(facultyUrl);
    section = page.locator("h2:has-text('Wallet transactions')").locator("..");
    sectionText = await section.innerText();
    check("Wallet transactions section shows the Withdrawal release row", sectionText.includes("Withdrawal release"));
    // Wallet started at GHS 5,000.00 (500,000 pesewas); the request released GHS 400.00 (40,000 pesewas).
    check("Release row shows the correct post-release balance (GHS 4,600.00)", sectionText.includes("4,600.00"));
    check("Wallet transactions section still shows the earlier Withdrawal hold row", sectionText.includes("Withdrawal hold"));
    await treasurerCtx2.close();
  } catch (error) {
    console.error("Script error:", error);
    failures++;
  } finally {
    await browser.close();

    const requestIds = await WithdrawalRequest.find({ organizationId: org._id }).distinct("_id");
    await WithdrawalSettlement.deleteMany({ withdrawalRequestId: { $in: requestIds } });
    await WithdrawalApproval.deleteMany({ withdrawalRequestId: { $in: requestIds } });
    await AuditLog.deleteMany({
      targetType: "WithdrawalRequest",
      targetId: { $in: requestIds.map((id: Types.ObjectId) => id.toString()) },
    });
    await WithdrawalRequest.deleteMany({ organizationId: org._id });
    await WalletTransaction.deleteMany({ walletId: wallet._id });
    await UserRole.deleteMany({ organizationId: org._id });
    await User.deleteMany({ _id: { $in: [treasurerUser._id, deanUser._id] } });
    await FacultyWallet.deleteOne({ _id: wallet._id });
    await Faculty.deleteOne({ _id: faculty._id });
    await Organization.deleteOne({ _id: org._id });
  }

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
