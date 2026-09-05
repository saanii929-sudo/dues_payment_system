import "@/lib/serverOnly";
import type { Model } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import {
  Organization,
  Student,
  Payment,
  FacultyWallet,
  DepartmentWallet,
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
import type { SessionUser } from "@/lib/permissions/roles";

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
    WithdrawalRequest.countDocuments({ status: "PENDING" }),
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

/** Org-scoped structural counts — Org Admin's dashboard. No financial figures yet since no payment flow exists. */
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
    PaymentPeriod.findOne({ organizationId, isCurrent: true }),
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

/** Successful-payment volume bucketed by day, zero-filled for days with no activity. */
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
