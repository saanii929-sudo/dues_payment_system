/**
 * Phase 24 — Student Payment Matching, exercised directly against the
 * service (no browser needed): a SUCCESSFUL payment matches Paid; a FAILED
 * payment followed by a SUCCESSFUL one still matches Paid (priority order);
 * a PENDING-only student matches Pending, distinct from a FAILED-only
 * student matching Failed; a roster row with no payment at all matches
 * Unpaid; a blank-index roster row is Invalid Index Number and excluded
 * from matching; a payment whose index number isn't on the roster is Not
 * Matched; counts and the matching percentage are all correct; a
 * StudentPaymentMatch row exists for every considered payment; the
 * exported workbook has both sheets with the right row counts. See
 * ARCHITECTURE.md Phase 24.
 */
import * as XLSX from "xlsx";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import { ROLES } from "@/lib/permissions/roles";
import type { SessionUser } from "@/lib/permissions/roles";
import {
  Organization,
  Faculty,
  Department,
  AcademicLevel,
  StudentCategory,
  PaymentPeriod,
  DuesConfiguration,
  Payment,
  Student,
  StudentListUpload,
  StudentListEntry,
  StudentPaymentMatch,
} from "@/models";
import { uploadStudentList } from "@/services/student-list.service";
import {
  runPaymentMatching,
  getPaymentMatchingReport,
  exportPaymentMatchingReport,
} from "@/services/student-payment-matching.service";

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

  const org = await Organization.create({
    name: "Phase24 Matching Org",
    slug: `phase24-matching-${suffix}`,
    contactEmail: `phase24-matching-${suffix}@test-uni.example`,
  });
  const faculty = await Faculty.create({
    organizationId: org._id,
    name: "Phase24 Faculty",
    code: `P24F${suffix.toString().slice(-6)}`,
  });
  const department = await Department.create({
    organizationId: org._id,
    facultyId: faculty._id,
    name: "Phase24 Department",
    code: `P24D${suffix.toString().slice(-6)}`,
  });
  const academicLevel = await AcademicLevel.create({
    organizationId: org._id,
    name: "Phase24 Level",
    code: `P24L${suffix.toString().slice(-6)}`,
    sortOrder: 1,
  });
  const studentCategory = await StudentCategory.create({
    organizationId: org._id,
    name: "Phase24 Category",
    code: `P24C${suffix.toString().slice(-6)}`,
    sortOrder: 1,
  });
  const period = await PaymentPeriod.create({
    organizationId: org._id,
    name: "Phase24 Period",
    code: `P24P${suffix.toString().slice(-6)}`,
    academicYear: "2025/2026",
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 30),
    paymentOpenDate: new Date(),
    paymentCloseDate: new Date(Date.now() + 86400000 * 30),
    status: "ACTIVE",
  });
  const duesConfig = await DuesConfiguration.create({
    organizationId: org._id,
    paymentPeriodId: period._id,
    name: "Phase24 Dues",
    code: `P24DUES${suffix.toString().slice(-6)}`,
    amountPesewas: 10_000,
    effectiveDate: new Date(),
    isMandatory: true,
    status: "ACTIVE",
  });

  const organizationId = org._id.toString();
  const orgAdmin: SessionUser = { userId: new Types.ObjectId().toString(), role: ROLES.ORG_ADMIN, organizationId };

  function makePayment(indexNumber: string, name: string, status: "PENDING" | "SUCCESSFUL" | "FAILED") {
    return Payment.create({
      organizationId: org._id,
      paymentPeriodId: period._id,
      duesConfigurationId: duesConfig._id,
      duesConfigurationSnapshot: {
        name: duesConfig.name,
        code: duesConfig.code,
        amountPesewas: duesConfig.amountPesewas,
        effectiveDate: duesConfig.effectiveDate,
      },
      studentIndexNumber: indexNumber,
      studentSnapshot: {
        fullName: name,
        facultyId: faculty._id,
        departmentId: department._id,
        academicLevelId: academicLevel._id,
        studentCategoryId: studentCategory._id,
      },
      amountPesewas: 10_000,
      currency: "GHS",
      provider: "HUBTEL",
      clientReference: `P24-${indexNumber}-${status}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status,
      paidAt: status === "SUCCESSFUL" ? new Date() : undefined,
    });
  }

  try {
    // ---- Payments ----
    await makePayment("P24-001", "Paid Student", "SUCCESSFUL");
    await makePayment("P24-002", "Priority Student", "FAILED");
    await new Promise((resolve) => setTimeout(resolve, 5)); // ensure createdAt ordering
    await makePayment("P24-002", "Priority Student", "SUCCESSFUL");
    await makePayment("P24-003", "Pending Student", "PENDING");
    await makePayment("P24-004", "Failed Student", "FAILED");
    // P24-005 "Unpaid Student" gets no payment at all.
    await makePayment("P24-999", "Ghost Student", "SUCCESSFUL"); // not on the roster

    // ---- Roster ----
    const header = ["Index Number", "Full Name", "Faculty", "Department", "Academic Level", "Student Category"];
    const roster = csvBuffer([
      header,
      ["P24-001", "Paid Student", faculty.name, department.name, academicLevel.name, studentCategory.name],
      ["P24-002", "Priority Student", faculty.name, department.name, academicLevel.name, studentCategory.name],
      ["P24-003", "Pending Student", faculty.name, department.name, academicLevel.name, studentCategory.name],
      ["P24-004", "Failed Student", faculty.name, department.name, academicLevel.name, studentCategory.name],
      ["P24-005", "Unpaid Student", faculty.name, department.name, academicLevel.name, studentCategory.name],
      ["", "No Index Student", "", "", "", ""],
    ]);

    const uploadId = await uploadStudentList(orgAdmin, organizationId, {
      buffer: roster,
      mimeType: "text/csv",
      fileName: "phase24-roster.csv",
      sizeBytes: roster.length,
    });

    const filters = { paymentPeriodId: period._id.toString() };
    const report = await runPaymentMatching(orgAdmin, organizationId, uploadId, filters);

    const byIndex = (indexNumber: string) => report.rows.find((r) => r.indexNumber === indexNumber);

    check("SUCCESSFUL payment matches Paid", byIndex("P24-001")?.status === "PAID");
    check("FAILED-then-SUCCESSFUL matches Paid (priority order)", byIndex("P24-002")?.status === "PAID");
    check("PENDING-only matches Pending", byIndex("P24-003")?.status === "PENDING");
    check("FAILED-only matches Failed, distinct from Pending", byIndex("P24-004")?.status === "FAILED");
    check("No payment at all matches Unpaid", byIndex("P24-005")?.status === "UNPAID");
    check("Blank index number row is excluded from roster rows", !report.rows.some((r) => r.indexNumber === ""));

    check("Counts: paid=2", report.counts.paid === 2, report.counts);
    check("Counts: unpaid=1", report.counts.unpaid === 1);
    check("Counts: pending=1", report.counts.pending === 1);
    check("Counts: failed=1", report.counts.failed === 1);
    check("Counts: invalidIndexNumber=1", report.counts.invalidIndexNumber === 1);
    check("Counts: notMatched=1", report.counts.notMatched === 1);
    check("Matching percentage is 2/5 = 40%", report.counts.matchingPercentage === 40, report.counts.matchingPercentage);

    check(
      "Not matched payments includes the ghost payment",
      report.notMatchedPayments.some((p) => p.indexNumber === "P24-999"),
    );

    // ---- StudentPaymentMatch persistence ----
    const paymentCount = await Payment.countDocuments({ organizationId, studentIndexNumber: { $regex: /^P24-/ } });
    const matchCount = await StudentPaymentMatch.countDocuments({ organizationId });
    check("A StudentPaymentMatch row exists for every considered payment", matchCount === paymentCount, {
      paymentCount,
      matchCount,
    });
    const matchedCount = await StudentPaymentMatch.countDocuments({ organizationId, matchStatus: "MATCHED" });
    const unmatchedCount = await StudentPaymentMatch.countDocuments({ organizationId, matchStatus: "UNMATCHED" });
    check("5 payments are MATCHED, 1 is UNMATCHED", matchedCount === 5 && unmatchedCount === 1, {
      matchedCount,
      unmatchedCount,
    });

    // ---- Re-run (getPaymentMatchingReport) doesn't duplicate StudentPaymentMatch rows ----
    await getPaymentMatchingReport(orgAdmin, organizationId, uploadId, filters);
    const matchCountAfterReread = await StudentPaymentMatch.countDocuments({ organizationId });
    check("Re-reading the report doesn't write duplicate StudentPaymentMatch rows", matchCountAfterReread === paymentCount);

    // ---- Export ----
    const exportBuffer = await exportPaymentMatchingReport(orgAdmin, organizationId, uploadId, filters);
    const exportedWorkbook = XLSX.read(exportBuffer, { type: "buffer" });
    check(
      "Exported workbook has both sheets",
      exportedWorkbook.SheetNames.includes("Roster Matching") && exportedWorkbook.SheetNames.includes("Not Matched Payments"),
    );
    const rosterSheetRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets["Roster Matching"], { header: 1 });
    const notMatchedSheetRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets["Not Matched Payments"], { header: 1 });
    check("Roster Matching sheet has a header + 5 data rows", rosterSheetRows.length === 6, rosterSheetRows.length);
    check("Not Matched Payments sheet has a header + 1 data row", notMatchedSheetRows.length === 2, notMatchedSheetRows.length);
  } catch (error) {
    console.error("Script error:", error);
    failures++;
  } finally {
    await StudentPaymentMatch.deleteMany({ organizationId });
    const uploadIds = await StudentListUpload.find({ organizationId }).distinct("_id");
    await StudentListEntry.deleteMany({ uploadId: { $in: uploadIds } });
    await StudentListUpload.deleteMany({ organizationId });
    await Student.deleteMany({ organizationId });
    await Payment.deleteMany({ organizationId });
    await DuesConfiguration.deleteOne({ _id: duesConfig._id });
    await PaymentPeriod.deleteOne({ _id: period._id });
    await StudentCategory.deleteOne({ _id: studentCategory._id });
    await AcademicLevel.deleteOne({ _id: academicLevel._id });
    await Department.deleteOne({ _id: department._id });
    await Faculty.deleteOne({ _id: faculty._id });
    await Organization.deleteOne({ _id: org._id });
  }

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
