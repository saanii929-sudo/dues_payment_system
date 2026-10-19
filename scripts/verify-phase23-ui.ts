/**
 * Phase 23 — confirms the /admin/students UI actually works end to end:
 * log in as Org Admin, upload a CSV via the real dialog, see it land in the
 * history table, open the detail view, and download the original file back
 * byte-for-byte. See ARCHITECTURE.md Phase 23.
 */
import * as XLSX from "xlsx";
import { chromium } from "playwright";
import { connectToDatabase } from "@/lib/db/connection";
import { StudentListUpload, StudentListEntry, Student } from "@/models";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = "http://localhost:3000";
const ORG_ADMIN_EMAIL = "orgadmin@test-uni.example";
const ORG_ADMIN_PASSWORD = "OrgAdmin-Pass1!";

let failures = 0;
function check(label: string, pass: boolean, detail?: unknown): void {
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}`, detail !== undefined ? JSON.stringify(detail) : "");
  if (!pass) failures++;
}

function csvBuffer(rows: string[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "csv" }) as Buffer;
}

async function main() {
  await connectToDatabase();
  const suffix = Date.now();
  const fileName = `phase23-ui-test-${suffix}.csv`;
  const csv = csvBuffer([
    ["Index Number", "Full Name"],
    [`PH23UI-${suffix}`, "Phase23 UI Test Student"],
  ]);
  const tmpPath = path.join(os.tmpdir(), fileName);
  fs.writeFileSync(tmpPath, csv);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${BASE}/login`);
    await page.fill("#email", ORG_ADMIN_EMAIL);
    await page.fill("#password", ORG_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto(`${BASE}/admin/students`);
    await page.click('button:has-text("Upload student list")');
    const dialog = page.getByRole("dialog").filter({ hasText: "Upload student list" });
    await dialog.locator('input[type="file"]').setInputFiles(tmpPath);
    await dialog.getByRole("button", { name: "Upload" }).click();
    await page.waitForTimeout(1500);

    await page.goto(`${BASE}/admin/students`);
    const row = page.locator("tr", { has: page.locator(`td:has-text("${fileName}")`) });
    check("Uploaded file appears in the history table", (await row.count()) > 0);
    const rowText = await row.innerText();
    check("History row shows COMPLETED status", rowText.includes("COMPLETED"));
    check("History row shows 1 total / 1 valid / 0 failed", /\b1\b[\s\S]*\b1\b[\s\S]*\b0\b/.test(rowText));

    await row.locator("a", { hasText: fileName }).click();
    await page.waitForURL(/\/admin\/students\/.+/, { timeout: 15000 });
    const detailText = await page.locator("body").innerText();
    check("Detail page shows the student's index number", detailText.includes(`PH23UI-${suffix}`));
    check("Detail page shows VALID row status", detailText.includes("VALID"));

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click('a:has-text("Download original file")'),
    ]);
    const downloadedPath = await download.path();
    const downloadedBytes = downloadedPath ? fs.readFileSync(downloadedPath) : Buffer.alloc(0);
    check("Downloaded file bytes match the uploaded CSV", downloadedBytes.equals(csv));
  } catch (error) {
    console.error("Script error:", error);
    failures++;
  } finally {
    await browser.close();
    fs.rmSync(tmpPath, { force: true });

    const upload = await StudentListUpload.findOne({ fileName });
    if (upload) {
      await StudentListEntry.deleteMany({ uploadId: upload._id });
      await StudentListUpload.deleteOne({ _id: upload._id });
    }
    await Student.deleteMany({ indexNumber: `PH23UI-${suffix}` });
  }

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
