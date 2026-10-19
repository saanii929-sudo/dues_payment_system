import "@/lib/serverOnly";
import * as XLSX from "xlsx";
import { connectToDatabase } from "@/lib/db/connection";
import { StudentListUpload, StudentListEntry, Student } from "@/models";
import type { StudentListFileFormat, StudentListRowStatus, StudentListUploadStatus } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { listFaculties } from "@/services/faculty.service";
import { listDepartments } from "@/services/department.service";
import { listAcademicLevels } from "@/services/academic-level.service";
import { listStudentCategories } from "@/services/student-category.service";
import type { SessionUser } from "@/lib/permissions/roles";

export class StudentListError extends Error {}

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  indexnumber: "indexNumber",
  indexno: "indexNumber",
  index: "indexNumber",
  studentindexnumber: "indexNumber",
  fullname: "fullName",
  name: "fullName",
  studentname: "fullName",
  faculty: "faculty",
  facultyname: "faculty",
  department: "department",
  departmentname: "department",
  academiclevel: "academicLevel",
  level: "academicLevel",
  academicyear: "academicLevel",
  studentcategory: "studentCategory",
  category: "studentCategory",
};

function fileFormatFromName(fileName: string): StudentListFileFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "CSV";
  if (lower.endsWith(".xlsx")) return "XLSX";
  return "XLS";
}

interface ParsedRow {
  indexNumber: string;
  fullName: string;
  faculty: string;
  department: string;
  academicLevel: string;
  studentCategory: string;
}


function parseWorkbook(buffer: Buffer): ParsedRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new StudentListError("The file could not be read — it may be corrupted or not a valid CSV/Excel file.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new StudentListError("The file has no sheets.");
  }
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  if (rawRows.length === 0) {
    throw new StudentListError("The file is empty.");
  }

  const headerRow = (rawRows[0] ?? []).map((cell) => String(cell ?? ""));
  const fieldForColumn = headerRow.map((header) => HEADER_ALIASES[normalizeHeader(header)]);

  const missing: string[] = [];
  if (!fieldForColumn.includes("indexNumber")) missing.push("Index Number");
  if (!fieldForColumn.includes("fullName")) missing.push("Full Name");
  if (missing.length > 0) {
    throw new StudentListError(`Missing required column(s): ${missing.join(", ")}.`);
  }

  const rows: ParsedRow[] = [];
  for (const rawRow of rawRows.slice(1)) {
    if (!rawRow || rawRow.every((cell) => String(cell ?? "").trim() === "")) continue; // skip fully blank rows

    const row: Record<string, string> = {};
    fieldForColumn.forEach((field, index) => {
      if (field) row[field] = String(rawRow[index] ?? "").trim();
    });
    rows.push({
      indexNumber: row.indexNumber ?? "",
      fullName: row.fullName ?? "",
      faculty: row.faculty ?? "",
      department: row.department ?? "",
      academicLevel: row.academicLevel ?? "",
      studentCategory: row.studentCategory ?? "",
    });
  }
  return rows;
}

function buildLookup(entries: { id: string; name: string; code: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    map.set(entry.name.toLowerCase(), entry.id);
    map.set(entry.code.toLowerCase(), entry.id);
  }
  return map;
}

/** `undefined` = not provided (fine, optional); `null` = provided but doesn't match anything (invalid). */
function resolveReference(map: Map<string, string>, value: string): string | null | undefined {
  if (!value) return undefined;
  return map.get(value.toLowerCase()) ?? null;
}

export interface StudentListUploadSummary {
  uploadId: string;
  fileName: string;
  fileFormat: StudentListFileFormat;
  status: StudentListUploadStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errorLog: string | null;
  uploadedByName: string | null;
  createdAt: Date;
}

export interface UploadStudentListFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}

export async function uploadStudentList(
  actor: SessionUser,
  organizationId: string,
  file: UploadStudentListFile,
): Promise<string> {
  assertCan(actor, "student-list:upload", { organizationId });
  await connectToDatabase();

  const extension = file.fileName.toLowerCase().slice(file.fileName.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new StudentListError(`Unsupported file format "${extension || "unknown"}" — upload a .csv, .xlsx, or .xls file.`);
  }
  if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new StudentListError(
      `File is too large (${(file.sizeBytes / (1024 * 1024)).toFixed(1)}MB) — the limit is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
    );
  }
  if (file.sizeBytes === 0) {
    throw new StudentListError("The file is empty.");
  }

  const fileFormat = fileFormatFromName(file.fileName);

  let rows: ParsedRow[];
  try {
    rows = parseWorkbook(file.buffer);
  } catch (error) {
    const errorLog = error instanceof StudentListError ? error.message : "Failed to parse the file.";
    const failedUpload = await StudentListUpload.create({
      organizationId,
      uploadedById: actor.userId,
      fileName: file.fileName,
      fileFormat,
      status: "FAILED",
      totalRows: 0,
      successRows: 0,
      failedRows: 0,
      errorLog,
      originalFileData: file.buffer,
      originalFileMimeType: file.mimeType,
      originalFileSizeBytes: file.sizeBytes,
    });
    await recordAudit({
      organizationId,
      actorId: actor.userId,
      actorRoleSnapshot: actor.role,
      action: "student_list.upload_failed",
      targetType: "StudentListUpload",
      targetId: failedUpload._id.toString(),
      metadata: { fileName: file.fileName, errorLog },
    });
    throw new StudentListError(errorLog);
  }

  const [faculties, departments, academicLevels, studentCategories] = await Promise.all([
    listFaculties(actor, organizationId),
    listDepartments(actor, organizationId),
    listAcademicLevels(actor, organizationId),
    listStudentCategories(actor, organizationId),
  ]);
  const facultyMap = buildLookup(faculties.map((f) => ({ id: f.facultyId, name: f.name, code: f.code })));
  const departmentMap = buildLookup(departments.map((d) => ({ id: d.departmentId, name: d.name, code: d.code })));
  const academicLevelMap = buildLookup(academicLevels.map((l) => ({ id: l.academicLevelId, name: l.name, code: l.code })));
  const studentCategoryMap = buildLookup(
    studentCategories.map((c) => ({ id: c.studentCategoryId, name: c.name, code: c.code })),
  );

  const seenIndexNumbers = new Set<string>();
  const entries: {
    indexNumber: string;
    fullName: string;
    facultyId?: string;
    departmentId?: string;
    academicLevelId?: string;
    studentCategoryId?: string;
    rowStatus: StudentListRowStatus;
    errorReason?: string;
  }[] = [];

  for (const row of rows) {
    const issues: string[] = [];

    if (!row.indexNumber) issues.push("Missing index number");
    if (!row.fullName) issues.push("Missing full name");

    const isDuplicate = row.indexNumber && seenIndexNumbers.has(row.indexNumber.toLowerCase());
    if (row.indexNumber) seenIndexNumbers.add(row.indexNumber.toLowerCase());

    const facultyId = resolveReference(facultyMap, row.faculty);
    if (facultyId === null) issues.push(`Unknown faculty: "${row.faculty}"`);
    const departmentId = resolveReference(departmentMap, row.department);
    if (departmentId === null) issues.push(`Unknown department: "${row.department}"`);
    const academicLevelId = resolveReference(academicLevelMap, row.academicLevel);
    if (academicLevelId === null) issues.push(`Unknown academic level: "${row.academicLevel}"`);
    const studentCategoryId = resolveReference(studentCategoryMap, row.studentCategory);
    if (studentCategoryId === null) issues.push(`Unknown student category: "${row.studentCategory}"`);

    let rowStatus: StudentListRowStatus;
    let errorReason: string | undefined;
    if (issues.length > 0) {
      rowStatus = "INVALID";
      errorReason = issues.join("; ");
    } else if (isDuplicate) {
      rowStatus = "DUPLICATE";
      errorReason = "Duplicate index number within this file";
    } else {
      rowStatus = "VALID";
    }

    entries.push({
      indexNumber: row.indexNumber,
      fullName: row.fullName,
      facultyId: facultyId ?? undefined,
      departmentId: departmentId ?? undefined,
      academicLevelId: academicLevelId ?? undefined,
      studentCategoryId: studentCategoryId ?? undefined,
      rowStatus,
      errorReason,
    });
  }

  const upload = await StudentListUpload.create({
    organizationId,
    uploadedById: actor.userId,
    fileName: file.fileName,
    fileFormat,
    status: "COMPLETED",
    totalRows: entries.length,
    successRows: entries.filter((e) => e.rowStatus === "VALID").length,
    failedRows: entries.filter((e) => e.rowStatus !== "VALID").length,
    originalFileData: file.buffer,
    originalFileMimeType: file.mimeType,
    originalFileSizeBytes: file.sizeBytes,
  });

  for (const entry of entries) {
    await StudentListEntry.create({
      uploadId: upload._id,
      organizationId,
      indexNumber: entry.indexNumber || "(none)",
      fullName: entry.fullName || "(none)",
      facultyId: entry.facultyId,
      departmentId: entry.departmentId,
      academicLevelId: entry.academicLevelId,
      studentCategoryId: entry.studentCategoryId,
      rowStatus: entry.rowStatus,
      errorReason: entry.errorReason,
    });

    if (entry.rowStatus === "VALID") {
      const setFields: Record<string, unknown> = { fullName: entry.fullName };
      if (entry.facultyId) setFields.facultyId = entry.facultyId;
      if (entry.departmentId) setFields.departmentId = entry.departmentId;
      if (entry.academicLevelId) setFields.academicLevelId = entry.academicLevelId;
      if (entry.studentCategoryId) setFields.studentCategoryId = entry.studentCategoryId;

      await Student.findOneAndUpdate(
        { organizationId, indexNumber: entry.indexNumber },
        { $set: setFields, $setOnInsert: { organizationId, indexNumber: entry.indexNumber } },
        { upsert: true },
      );
    }
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "student_list.uploaded",
    targetType: "StudentListUpload",
    targetId: upload._id.toString(),
    metadata: {
      fileName: file.fileName,
      totalRows: entries.length,
      successRows: upload.successRows,
      failedRows: upload.failedRows,
    },
  });

  return upload._id.toString();
}

export async function listStudentListUploads(
  actor: SessionUser,
  organizationId: string,
): Promise<StudentListUploadSummary[]> {
  assertCan(actor, "student-list:upload", { organizationId });
  await connectToDatabase();

  const uploads = await StudentListUpload.find({ organizationId })
    .select("-originalFileData")
    .populate<{ uploadedById: { fullName: string } | null }>("uploadedById")
    .sort({ createdAt: -1 })
    .limit(100);

  return uploads.map((upload) => ({
    uploadId: upload._id.toString(),
    fileName: upload.fileName,
    fileFormat: upload.fileFormat,
    status: upload.status,
    totalRows: upload.totalRows,
    successRows: upload.successRows,
    failedRows: upload.failedRows,
    errorLog: upload.errorLog ?? null,
    uploadedByName: upload.uploadedById?.fullName ?? null,
    createdAt: upload.createdAt,
  }));
}

export interface StudentListEntrySummary {
  entryId: string;
  indexNumber: string;
  fullName: string;
  facultyName: string | null;
  departmentName: string | null;
  academicLevelName: string | null;
  studentCategoryName: string | null;
  rowStatus: StudentListRowStatus;
  errorReason: string | null;
}

export interface StudentListUploadDetails extends StudentListUploadSummary {
  entries: StudentListEntrySummary[];
}

/**
 * The populated-document type Mongoose infers from a multi-key
 * `.populate<T>([...])` call doesn't structurally match a hand-written
 * parameter type (the same Mongoose/TS limitation `withdrawal.service.ts`'s
 * `toSummary` already works around) — every field read below is genuinely
 * present at runtime. The parameter is `any` with this comment explaining
 * why; the *return* type stays strictly `StudentListEntrySummary`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEntrySummary(entry: any): StudentListEntrySummary {
  return {
    entryId: entry._id.toString(),
    indexNumber: entry.indexNumber,
    fullName: entry.fullName,
    facultyName: entry.facultyId?.name ?? null,
    departmentName: entry.departmentId?.name ?? null,
    academicLevelName: entry.academicLevelId?.name ?? null,
    studentCategoryName: entry.studentCategoryId?.name ?? null,
    rowStatus: entry.rowStatus,
    errorReason: entry.errorReason ?? null,
  };
}

async function loadOwnedUpload(organizationId: string, uploadId: string) {
  const upload = await StudentListUpload.findOne({ _id: uploadId, organizationId });
  if (!upload) throw new StudentListError("Upload not found.");
  return upload;
}

export async function getStudentListUploadDetails(
  actor: SessionUser,
  organizationId: string,
  uploadId: string,
): Promise<StudentListUploadDetails> {
  assertCan(actor, "student-list:upload", { organizationId });
  await connectToDatabase();

  const upload = await loadOwnedUpload(organizationId, uploadId);
  const entries = await StudentListEntry.find({ uploadId })
    .populate<{ facultyId: { name: string } | null }>("facultyId")
    .populate<{ departmentId: { name: string } | null }>("departmentId")
    .populate<{ academicLevelId: { name: string } | null }>("academicLevelId")
    .populate<{ studentCategoryId: { name: string } | null }>("studentCategoryId")
    .sort({ createdAt: 1 })
    .limit(2000);

  return {
    uploadId: upload._id.toString(),
    fileName: upload.fileName,
    fileFormat: upload.fileFormat,
    status: upload.status,
    totalRows: upload.totalRows,
    successRows: upload.successRows,
    failedRows: upload.failedRows,
    errorLog: upload.errorLog ?? null,
    uploadedByName: null,
    createdAt: upload.createdAt,
    entries: entries.map(toEntrySummary),
  };
}

export interface StudentListUploadFile {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

export async function getStudentListUploadFile(
  actor: SessionUser,
  organizationId: string,
  uploadId: string,
): Promise<StudentListUploadFile> {
  assertCan(actor, "student-list:upload", { organizationId });
  await connectToDatabase();

  const upload = await loadOwnedUpload(organizationId, uploadId);
  return {
    fileName: upload.fileName,
    mimeType: upload.originalFileMimeType,
    data: upload.originalFileData,
  };
}
