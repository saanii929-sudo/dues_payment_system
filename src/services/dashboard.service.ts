import "@/lib/serverOnly";
import { Types, type Model } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import {
  Organization,
  Student,
  Payment,
  FacultyWallet,
  DepartmentWallet,
  RevenueAllocation,
  WithdrawalRequest,
  WithdrawalSettlement,
  Faculty,
  Department,
  AcademicLevel,
  StudentCategory,
  PaymentPeriod,
  DuesConfiguration,
  UserRole,
} from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { getAvailableBalance } from "@/services/withdrawal.service";
import type { SessionUser } from "@/lib/permissions/roles";

export class DashboardError extends Error {}

export interface SuperAdminDashboardMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  totalStudents: number;
  totalSuccessfulPayments: number;
  totalTransactionVolumePesewas: number;
  pendingPayments: number;
  failedPayments: number;
  totalFacultyBalancesPesewas: number;
  totalDepartmentBalancesPesewas: number;
  pendingWithdrawals: number;
  releasedFundsPesewas: number;
}

async function sumField(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  match: Record<string, unknown>,
  field: string,
): Promise<number> {
  const result = await model.aggregate<{ total: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return result[0]?.total ?? 0;
}

async function withdrawalStatusBuckets(
  walletMatch: Record<string, unknown>,
): Promise<{
  pendingWithdrawals: WithdrawalStatusTotal;
  approvedWithdrawals: WithdrawalStatusTotal;
  releasedWithdrawals: WithdrawalStatusTotal;
}> {
  const pendingMatch = {
    ...walletMatch,
    status: { $in: ["PENDING_DEAN_APPROVAL", "RETURNED_FOR_CORRECTION", "PENDING_SUPER_ADMIN_APPROVAL"] },
  };
  const approvedMatch = { ...walletMatch, status: "SUPER_ADMIN_APPROVED" };
  const releasedMatch = { ...walletMatch, status: "RELEASED" };

  const [pendingCount, pendingSum, approvedCount, approvedSum, releasedCount, releasedSum] =
    await Promise.all([
      WithdrawalRequest.countDocuments(pendingMatch),
      sumField(WithdrawalRequest, pendingMatch, "amountPesewas"),
      WithdrawalRequest.countDocuments(approvedMatch),
      sumField(WithdrawalRequest, approvedMatch, "amountPesewas"),
      WithdrawalRequest.countDocuments(releasedMatch),
      sumField(WithdrawalRequest, releasedMatch, "amountPesewas"),
    ]);

  return {
    pendingWithdrawals: { count: pendingCount, amountPesewas: pendingSum },
    approvedWithdrawals: { count: approvedCount, amountPesewas: approvedSum },
    releasedWithdrawals: { count: releasedCount, amountPesewas: releasedSum },
  };
}

export async function getSuperAdminDashboardMetrics(
  actor: SessionUser,
): Promise<SuperAdminDashboardMetrics> {
  assertCan(actor, "platform:manage");
  await connectToDatabase();

  const [
    totalOrganizations,
    activeOrganizations,
    totalStudents,
    totalSuccessfulPayments,
    totalTransactionVolumePesewas,
    pendingPayments,
    failedPayments,
    totalFacultyBalancesPesewas,
    totalDepartmentBalancesPesewas,
    pendingWithdrawals,
    releasedFundsPesewas,
  ] = await Promise.all([
    Organization.countDocuments(),
    Organization.countDocuments({ isActive: true }),
    Student.countDocuments(),
    Payment.countDocuments({ status: "SUCCESSFUL" }),
    sumField(Payment, { status: "SUCCESSFUL" }, "amountPesewas"),
    Payment.countDocuments({ status: "PENDING" }),
    Payment.countDocuments({ status: "FAILED" }),
    sumField(FacultyWallet, {}, "balancePesewas"),
    sumField(DepartmentWallet, {}, "balancePesewas"),
    WithdrawalRequest.countDocuments({
      status: { $in: ["PENDING_DEAN_APPROVAL", "RETURNED_FOR_CORRECTION", "PENDING_SUPER_ADMIN_APPROVAL"] },
    }),
    sumField(WithdrawalSettlement, {}, "amountPesewas"),
  ]);

  return {
    totalOrganizations,
    activeOrganizations,
    totalStudents,
    totalSuccessfulPayments,
    totalTransactionVolumePesewas,
    pendingPayments,
    failedPayments,
    totalFacultyBalancesPesewas,
    totalDepartmentBalancesPesewas,
    pendingWithdrawals,
    releasedFundsPesewas,
  };
}

export interface OrgAdminDashboardMetrics {
  facultyCount: number;
  departmentCount: number;
  academicLevelCount: number;
  studentCategoryCount: number;
  paymentPeriodCount: number;
  currentPaymentPeriodName: string | null;
  duesConfigurationCount: number;
  studentCount: number;
  activeUserCount: number;
}

export async function getOrgAdminDashboardMetrics(
  actor: SessionUser,
  organizationId: string,
): Promise<OrgAdminDashboardMetrics> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const [
    facultyCount,
    departmentCount,
    academicLevelCount,
    studentCategoryCount,
    paymentPeriodCount,
    currentPaymentPeriod,
    duesConfigurationCount,
    studentCount,
    activeUserCount,
  ] = await Promise.all([
    Faculty.countDocuments({ organizationId }),
    Department.countDocuments({ organizationId }),
    AcademicLevel.countDocuments({ organizationId }),
    StudentCategory.countDocuments({ organizationId }),
    PaymentPeriod.countDocuments({ organizationId }),
    PaymentPeriod.findOne({ organizationId, status: "ACTIVE" }),
    DuesConfiguration.countDocuments({ organizationId }),
    Student.countDocuments({ organizationId }),
    UserRole.countDocuments({ organizationId, isActive: true }),
  ]);

  return {
    facultyCount,
    departmentCount,
    academicLevelCount,
    studentCategoryCount,
    paymentPeriodCount,
    currentPaymentPeriodName: currentPaymentPeriod?.name ?? null,
    duesConfigurationCount,
    studentCount,
    activeUserCount,
  };
}

export interface VolumeTrendPoint {
  date: string; // YYYY-MM-DD
  amountPesewas: number;
}

export async function getTransactionVolumeTrend(
  actor: SessionUser,
  days = 14,
): Promise<VolumeTrendPoint[]> {
  assertCan(actor, "platform:manage");
  await connectToDatabase();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = await Payment.aggregate<{ _id: string; total: number }>([
    { $match: { status: "SUCCESSFUL", paidAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
        total: { $sum: "$amountPesewas" },
      },
    },
  ]);
  const totalsByDate = new Map(rows.map((row) => [row._id, row.total]));

  const points: VolumeTrendPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    points.push({ date: key, amountPesewas: totalsByDate.get(key) ?? 0 });
  }

  return points;
}

export interface FacultyDashboardFilters {
  studentCategoryId?: string;
  academicLevelId?: string;
  paymentPeriodId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface WithdrawalStatusTotal {
  count: number;
  amountPesewas: number;
}

export interface FacultyDashboardFilterOptions {
  departments: { departmentId: string; name: string }[];
  academicLevels: { academicLevelId: string; name: string }[];
  studentCategories: { studentCategoryId: string; name: string }[];
  paymentPeriods: { paymentPeriodId: string; name: string }[];
}

export interface FacultyDashboardMetrics {
  facultyName: string;
  totalDuesCollectedPesewas: number;
  successfulPaymentsCount: number;
  facultyShareEarnedPesewas: number;
  facultyShareWithdrawnPesewas: number;
  availableBalancePesewas: number;
  pendingWithdrawals: WithdrawalStatusTotal;
  approvedWithdrawals: WithdrawalStatusTotal;
  releasedWithdrawals: WithdrawalStatusTotal;
  filterOptions: FacultyDashboardFilterOptions;
}

function dateRangeFilter(filters: FacultyDashboardFilters): Record<string, Date> | undefined {
  if (!filters.dateFrom && !filters.dateTo) return undefined;
  const range: Record<string, Date> = {};
  if (filters.dateFrom) range.$gte = new Date(filters.dateFrom);
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setUTCHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
}

export async function getFacultyDashboardMetrics(
  actor: SessionUser,
  organizationId: string,
  facultyId: string,
  filters: FacultyDashboardFilters,
): Promise<FacultyDashboardMetrics> {
  assertCan(actor, "faculty-dashboard:view", { organizationId, facultyId });
  await connectToDatabase();

  const faculty = await Faculty.findOne({ _id: facultyId, organizationId });
  if (!faculty) {
    throw new DashboardError("Faculty not found.");
  }

  const createdAtRange = dateRangeFilter(filters);
  const orgObjectId = new Types.ObjectId(organizationId);
  const facultyObjectId = new Types.ObjectId(facultyId);

  const paymentMatch: Record<string, unknown> = {
    organizationId: orgObjectId,
    status: "SUCCESSFUL",
    "studentSnapshot.facultyId": facultyObjectId,
  };
  if (filters.departmentId) {
    paymentMatch["studentSnapshot.departmentId"] = new Types.ObjectId(filters.departmentId);
  }
  if (filters.studentCategoryId) {
    paymentMatch["studentSnapshot.studentCategoryId"] = new Types.ObjectId(filters.studentCategoryId);
  }
  if (filters.academicLevelId) {
    paymentMatch["studentSnapshot.academicLevelId"] = new Types.ObjectId(filters.academicLevelId);
  }
  if (filters.paymentPeriodId) paymentMatch.paymentPeriodId = new Types.ObjectId(filters.paymentPeriodId);
  if (createdAtRange) paymentMatch.createdAt = createdAtRange;

  const allocationMatch: Record<string, unknown> = {
    organizationId: orgObjectId,
    facultyId: facultyObjectId,
    status: { $ne: "ADJUSTED" },
  };
  if (filters.departmentId) allocationMatch.departmentId = new Types.ObjectId(filters.departmentId);
  if (filters.studentCategoryId) {
    allocationMatch.studentCategoryId = new Types.ObjectId(filters.studentCategoryId);
  }
  if (filters.academicLevelId) allocationMatch.academicLevelId = new Types.ObjectId(filters.academicLevelId);
  if (filters.paymentPeriodId) allocationMatch.paymentPeriodId = new Types.ObjectId(filters.paymentPeriodId);
  if (createdAtRange) allocationMatch.createdAt = createdAtRange;

  const [
    successfulPaymentsCount,
    totalDuesCollectedPesewas,
    facultyShareEarnedPesewas,
    wallet,
    departments,
    academicLevels,
    studentCategories,
    paymentPeriods,
  ] = await Promise.all([
    Payment.countDocuments(paymentMatch),
    sumField(Payment, paymentMatch, "amountPesewas"),
    sumField(RevenueAllocation, allocationMatch, "facultyShareAmountPesewas"),
    FacultyWallet.findOne({ organizationId, facultyId }),
    Department.find({ organizationId, facultyId }).sort({ name: 1 }),
    AcademicLevel.find({ organizationId }).sort({ sortOrder: 1, name: 1 }),
    StudentCategory.find({ organizationId }).sort({ sortOrder: 1, name: 1 }),
    PaymentPeriod.find({ organizationId }).sort({ startDate: -1 }),
  ]);

  let pendingWithdrawals: WithdrawalStatusTotal = { count: 0, amountPesewas: 0 };
  let approvedWithdrawals: WithdrawalStatusTotal = { count: 0, amountPesewas: 0 };
  let releasedWithdrawals: WithdrawalStatusTotal = { count: 0, amountPesewas: 0 };
  let availableBalancePesewas = 0;

  if (wallet) {
    const [buckets, available] = await Promise.all([
      withdrawalStatusBuckets({ walletType: "FACULTY", walletId: wallet._id }),
      getAvailableBalance(organizationId, { walletType: "FACULTY", facultyId }),
    ]);
    pendingWithdrawals = buckets.pendingWithdrawals;
    approvedWithdrawals = buckets.approvedWithdrawals;
    releasedWithdrawals = buckets.releasedWithdrawals;
    availableBalancePesewas = available.availablePesewas;
  }

  return {
    facultyName: faculty.name,
    totalDuesCollectedPesewas,
    successfulPaymentsCount,
    facultyShareEarnedPesewas,
    facultyShareWithdrawnPesewas: releasedWithdrawals.amountPesewas,
    availableBalancePesewas,
    pendingWithdrawals,
    approvedWithdrawals,
    releasedWithdrawals,
    filterOptions: {
      departments: departments.map((d) => ({ departmentId: d._id.toString(), name: d.name })),
      academicLevels: academicLevels.map((l) => ({ academicLevelId: l._id.toString(), name: l.name })),
      studentCategories: studentCategories.map((c) => ({
        studentCategoryId: c._id.toString(),
        name: c.name,
      })),
      paymentPeriods: paymentPeriods.map((p) => ({ paymentPeriodId: p._id.toString(), name: p.name })),
    },
  };
}

export interface DepartmentDashboardFilters {
  studentCategoryId?: string;
  academicLevelId?: string;
  paymentPeriodId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DepartmentDashboardFilterOptions {
  academicLevels: { academicLevelId: string; name: string }[];
  studentCategories: { studentCategoryId: string; name: string }[];
  paymentPeriods: { paymentPeriodId: string; name: string }[];
}

export interface DepartmentDashboardMetrics {
  departmentName: string;
  totalDuesCollectedPesewas: number;
  successfulPaymentsCount: number;
  departmentShareEarnedPesewas: number;
  departmentShareWithdrawnPesewas: number;
  availableBalancePesewas: number;
  pendingWithdrawals: WithdrawalStatusTotal;
  approvedWithdrawals: WithdrawalStatusTotal;
  releasedWithdrawals: WithdrawalStatusTotal;
  filterOptions: DepartmentDashboardFilterOptions;
}

function departmentDateRangeFilter(
  filters: DepartmentDashboardFilters,
): Record<string, Date> | undefined {
  if (!filters.dateFrom && !filters.dateTo) return undefined;
  const range: Record<string, Date> = {};
  if (filters.dateFrom) range.$gte = new Date(filters.dateFrom);
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setUTCHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
}

export async function getDepartmentDashboardMetrics(
  actor: SessionUser,
  organizationId: string,
  departmentId: string,
  filters: DepartmentDashboardFilters,
): Promise<DepartmentDashboardMetrics> {
  assertCan(actor, "department-dashboard:view", { organizationId, departmentId });
  await connectToDatabase();

  const department = await Department.findOne({ _id: departmentId, organizationId });
  if (!department) {
    throw new DashboardError("Department not found.");
  }

  const createdAtRange = departmentDateRangeFilter(filters);

  const orgObjectId = new Types.ObjectId(organizationId);
  const departmentObjectId = new Types.ObjectId(departmentId);

  const paymentMatch: Record<string, unknown> = {
    organizationId: orgObjectId,
    status: "SUCCESSFUL",
    "studentSnapshot.departmentId": departmentObjectId,
  };
  if (filters.studentCategoryId) {
    paymentMatch["studentSnapshot.studentCategoryId"] = new Types.ObjectId(filters.studentCategoryId);
  }
  if (filters.academicLevelId) {
    paymentMatch["studentSnapshot.academicLevelId"] = new Types.ObjectId(filters.academicLevelId);
  }
  if (filters.paymentPeriodId) paymentMatch.paymentPeriodId = new Types.ObjectId(filters.paymentPeriodId);
  if (createdAtRange) paymentMatch.createdAt = createdAtRange;

  const allocationMatch: Record<string, unknown> = {
    organizationId: orgObjectId,
    departmentId: departmentObjectId,
    status: { $ne: "ADJUSTED" },
  };
  if (filters.studentCategoryId) {
    allocationMatch.studentCategoryId = new Types.ObjectId(filters.studentCategoryId);
  }
  if (filters.academicLevelId) allocationMatch.academicLevelId = new Types.ObjectId(filters.academicLevelId);
  if (filters.paymentPeriodId) allocationMatch.paymentPeriodId = new Types.ObjectId(filters.paymentPeriodId);
  if (createdAtRange) allocationMatch.createdAt = createdAtRange;

  const [
    successfulPaymentsCount,
    totalDuesCollectedPesewas,
    departmentShareEarnedPesewas,
    wallet,
    academicLevels,
    studentCategories,
    paymentPeriods,
  ] = await Promise.all([
    Payment.countDocuments(paymentMatch),
    sumField(Payment, paymentMatch, "amountPesewas"),
    sumField(RevenueAllocation, allocationMatch, "departmentShareAmountPesewas"),
    DepartmentWallet.findOne({ organizationId, departmentId }),
    AcademicLevel.find({ organizationId }).sort({ sortOrder: 1, name: 1 }),
    StudentCategory.find({ organizationId }).sort({ sortOrder: 1, name: 1 }),
    PaymentPeriod.find({ organizationId }).sort({ startDate: -1 }),
  ]);

  let pendingWithdrawals: WithdrawalStatusTotal = { count: 0, amountPesewas: 0 };
  let approvedWithdrawals: WithdrawalStatusTotal = { count: 0, amountPesewas: 0 };
  let releasedWithdrawals: WithdrawalStatusTotal = { count: 0, amountPesewas: 0 };
  let availableBalancePesewas = 0;

  if (wallet) {
    const [buckets, available] = await Promise.all([
      withdrawalStatusBuckets({ walletType: "DEPARTMENT", walletId: wallet._id }),
      getAvailableBalance(organizationId, { walletType: "DEPARTMENT", departmentId }),
    ]);
    pendingWithdrawals = buckets.pendingWithdrawals;
    approvedWithdrawals = buckets.approvedWithdrawals;
    releasedWithdrawals = buckets.releasedWithdrawals;
    availableBalancePesewas = available.availablePesewas;
  }

  return {
    departmentName: department.name,
    totalDuesCollectedPesewas,
    successfulPaymentsCount,
    departmentShareEarnedPesewas,
    departmentShareWithdrawnPesewas: releasedWithdrawals.amountPesewas,
    availableBalancePesewas,
    pendingWithdrawals,
    approvedWithdrawals,
    releasedWithdrawals,
    filterOptions: {
      academicLevels: academicLevels.map((l) => ({ academicLevelId: l._id.toString(), name: l.name })),
      studentCategories: studentCategories.map((c) => ({
        studentCategoryId: c._id.toString(),
        name: c.name,
      })),
      paymentPeriods: paymentPeriods.map((p) => ({ paymentPeriodId: p._id.toString(), name: p.name })),
    },
  };
}

