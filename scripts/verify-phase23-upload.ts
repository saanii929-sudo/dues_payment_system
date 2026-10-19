/**
 * Phase 23 — Student List Upload, exercised directly against the service
 * (no browser needed): a clean CSV/XLSX file imports every row as VALID and
 * upserts `Student` records by index number; a file missing a required
 * column fails the whole upload with no rows processed; a blank index
 * number, a within-file duplicate, and an unknown faculty name each land in
 * the right row status with the right reason; an oversized file is rejected
 * before parsing; an unsupported extension is rejected outright; a
 * corrected re-upload updates the existing `Student` rather than
 * duplicating it; the original file's bytes round-trip unchanged. See
 * ARCHITECTURE.md Phase 23.
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
  Student,
  StudentListUpload,
  StudentListEntry,
} from "@/models";
import {
  uploadStudentList,
  getStudentListUploadDetails,
  getStudentListUploadFile,
  StudentListError,
  MAX_FILE_SIZE_BYTES,
} from "@/services/student-list.service";

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

function xlsxBuffer(rows: string[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function main() {
  await connectToDatabase();
  const suffix = Date.now();

  const org = await Organization.create({
    name: "Phase23 Upload Org",
    slug: `phase23-upload-${suffix}`,
    contactEmail: `phase23-upload-${suffix}@test-uni.example`,
  });
  const faculty = await Faculty.create({
    organizationId: org._id,
    name: "Phase23 Faculty of Science",
    code: `P23F${suffix.toString().slice(-6)}`,
  });
  const department = await Department.create({
    organizationId: org._id,
    facultyId: faculty._id,
    name: "Phase23 Computer Science",
    code: `P23D${suffix.toString().slice(-6)}`,
  });
  const academicLevel = await AcademicLevel.create({
    organizationId: org._id,
    name: "Level 100",
    code: `L100`,
    sortOrder: 1,
  });
  const studentCategory = await StudentCategory.create({
    organizationId: org._id,
    name: "Regular",
    code: "REG",
    sortOrder: 1,
  });

  const organizationId = org._id.toString();
  const orgAdmin: SessionUser = { userId: new Types.ObjectId().toString(), role: ROLES.ORG_ADMIN, organizationId };

  const header = ["Index Number", "Full Name", "Faculty", "Department", "Academic Level", "Student Category"];

  try {
    // ================= Clean CSV — all rows valid =================
    const cleanCsv = csvBuffer([
      header,
      ["P23-001", "Ama Mensah", "Phase23 Faculty of Science", "Phase23 Computer Science", "Level 100", "Regular"],
      ["P23-002", "Kojo Boateng", "P23F" + suffix.toString().slice(-6), "P23D" + suffix.toString().slice(-6), "L100", "REG"],
    ]);
    const cleanUploadId = await uploadStudentList(orgAdmin, organizationId, {
      buffer: cleanCsv,
      mimeType: "text/csv",
      fileName: "clean-list.csv",
      sizeBytes: cleanCsv.length,
    });

    const cleanDetails = await getStudentListUploadDetails(orgAdmin, organizationId, cleanUploadId);
    check("Clean CSV upload status is COMPLETED", cleanDetails.status === "COMPLETED");
    check("Clean CSV has 2 total rows, 2 valid", cleanDetails.totalRows === 2 && cleanDetails.successRows === 2);
    check(
      "Both rows resolved Faculty/Department/Level/Category by name or code",
      cleanDetails.entries.every((e) => e.facultyName && e.departmentName && e.academicLevelName && e.studentCategoryName),
    );

    const student1 = await Student.findOne({ organizationId, indexNumber: "P23-001" });
    check("Student P23-001 was created with the resolved faculty/department", Boolean(student1) && student1?.facultyId?.toString() === faculty._id.toString());

    // ================= Missing required column =================
    const missingColumnFile = csvBuffer([
      ["Index Number", "Faculty"], // no Full Name column
      ["P23-003", "Phase23 Faculty of Science"],
    ]);
    let missingColumnError: string | null = null;
    try {
      await uploadStudentList(orgAdmin, organizationId, {
        buffer: missingColumnFile,
        mimeType: "text/csv",
        fileName: "missing-column.csv",
        sizeBytes: missingColumnFile.length,
      });
    } catch (error) {
      missingColumnError = error instanceof StudentListError ? error.message : "unexpected error type";
    }
    check(
      "Missing 'Full Name' column is rejected with a clear message",
      missingColumnError?.includes("Full Name") ?? false,
      missingColumnError,
    );
    const failedUpload = await StudentListUpload.findOne({ organizationId, fileName: "missing-column.csv" });
    check("The failed upload is recorded with status FAILED and 0 rows", failedUpload?.status === "FAILED" && failedUpload?.totalRows === 0);
    const failedEntries = await StudentListEntry.countDocuments({ uploadId: failedUpload?._id });
    check("No StudentListEntry rows were created for the file-level failure", failedEntries === 0);

    // ================= Row-level validation: blank index, duplicate, unknown faculty =================
    const mixedFile = csvBuffer([
      header,
      ["", "No Index Student", "", "", "", ""],
      ["P23-010", "First Occurrence", "", "", "", ""],
      ["P23-010", "Duplicate Occurrence", "", "", "", ""],
      ["P23-011", "Bad Faculty Student", "Nonexistent Faculty", "", "", ""],
    ]);
    const mixedUploadId = await uploadStudentList(orgAdmin, organizationId, {
      buffer: mixedFile,
      mimeType: "text/csv",
      fileName: "mixed-validity.csv",
      sizeBytes: mixedFile.length,
    });
    const mixedDetails = await getStudentListUploadDetails(orgAdmin, organizationId, mixedUploadId);
    const byName = (name: string) => mixedDetails.entries.find((e) => e.fullName === name);

    check("Blank index number row is INVALID with the right reason", byName("No Index Student")?.rowStatus === "INVALID" && (byName("No Index Student")?.errorReason ?? "").includes("Missing index number"));
    check("First occurrence of a repeated index number is VALID", byName("First Occurrence")?.rowStatus === "VALID");
    check("Second occurrence of the same index number is DUPLICATE", byName("Duplicate Occurrence")?.rowStatus === "DUPLICATE" && (byName("Duplicate Occurrence")?.errorReason ?? "").includes("Duplicate index number"));
    check("Unknown faculty name row is INVALID with the right reason", byName("Bad Faculty Student")?.rowStatus === "INVALID" && (byName("Bad Faculty Student")?.errorReason ?? "").includes("Unknown faculty"));
    check("Mixed file counts: total 4, success 1, failed 3", mixedDetails.totalRows === 4 && mixedDetails.successRows === 1 && mixedDetails.failedRows === 3);

    // ================= Oversized file rejected before parsing =================
    let oversizedError: string | null = null;
    try {
      await uploadStudentList(orgAdmin, organizationId, {
        buffer: Buffer.from("Index Number,Full Name\nP23-999,Someone"),
        mimeType: "text/csv",
        fileName: "oversized.csv",
        sizeBytes: MAX_FILE_SIZE_BYTES + 1,
      });
    } catch (error) {
      oversizedError = error instanceof StudentListError ? error.message : "unexpected error type";
    }
    check("Oversized file is rejected before parsing", oversizedError?.toLowerCase().includes("too large") ?? false, oversizedError);
    const oversizedUploadExists = await StudentListUpload.exists({ organizationId, fileName: "oversized.csv" });
    check("No upload record was created for the oversized rejection", !oversizedUploadExists);

    // ================= Unsupported file format rejected =================
    let formatError: string | null = null;
    try {
      await uploadStudentList(orgAdmin, organizationId, {
        buffer: Buffer.from("not a spreadsheet"),
        mimeType: "text/plain",
        fileName: "notes.txt",
        sizeBytes: 20,
      });
    } catch (error) {
      formatError = error instanceof StudentListError ? error.message : "unexpected error type";
    }
    check("Unsupported .txt extension is rejected", formatError?.toLowerCase().includes("unsupported") ?? false, formatError);

    // ================= XLSX format also works =================
    const xlsxFile = xlsxBuffer([header, ["P23-020", "Xlsx Student", "", "", "", ""]]);
    const xlsxUploadId = await uploadStudentList(orgAdmin, organizationId, {
      buffer: xlsxFile,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: "roster.xlsx",
      sizeBytes: xlsxFile.length,
    });
    const xlsxDetails = await getStudentListUploadDetails(orgAdmin, organizationId, xlsxUploadId);
    check("XLSX upload parses correctly (1 valid row)", xlsxDetails.fileFormat === "XLSX" && xlsxDetails.successRows === 1);

    // ================= Re-upload with the same index number updates, not duplicates =================
    const correctionFile = csvBuffer([header, ["P23-001", "Ama Mensah-Corrected", "", "", "", ""]]);
    await uploadStudentList(orgAdmin, organizationId, {
      buffer: correctionFile,
      mimeType: "text/csv",
      fileName: "correction.csv",
      sizeBytes: correctionFile.length,
    });
    const studentCountForIndex = await Student.countDocuments({ organizationId, indexNumber: "P23-001" });
    const updatedStudent = await Student.findOne({ organizationId, indexNumber: "P23-001" });
    check("Re-upload updated the existing Student, not created a second one", studentCountForIndex === 1);
    check("The Student's name was updated by the correction", updatedStudent?.fullName === "Ama Mensah-Corrected");
    check(
      "The Student's faculty (not present in the correction row) was left untouched",
      updatedStudent?.facultyId?.toString() === faculty._id.toString(),
    );

    // ================= Original file bytes round-trip unchanged =================
    const roundTrip = await getStudentListUploadFile(orgAdmin, organizationId, cleanUploadId);
    check("Downloaded file bytes match the originally uploaded bytes", roundTrip.data.equals(cleanCsv));
    check("Downloaded file name matches the original", roundTrip.fileName === "clean-list.csv");
  } catch (error) {
    console.error("Script error:", error);
    failures++;
  } finally {
    const uploadIds = await StudentListUpload.find({ organizationId }).distinct("_id");
    await StudentListEntry.deleteMany({ uploadId: { $in: uploadIds } });
    await StudentListUpload.deleteMany({ organizationId });
    await Student.deleteMany({ organizationId });
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
