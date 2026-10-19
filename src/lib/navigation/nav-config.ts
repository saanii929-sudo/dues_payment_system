import { ROLES } from "@/lib/permissions/roles";
import { resolveHomePath } from "@/lib/auth/redirectHome";
import type { SessionUser } from "@/lib/permissions/roles";

export type NavIconKey =
  | "dashboard"
  | "users"
  | "settings"
  | "organizations"
  | "audit"
  | "payments"
  | "revenue"
  | "profile"
  | "faculties"
  | "departments"
  | "academic-levels"
  | "student-categories"
  | "payment-periods"
  | "dues"
  | "duplicate-review"
  | "monitoring"
  | "reports"
  | "ledger"
  | "withdrawals"
  | "approvals"
  | "students"
  | "matching";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconKey;
}

export interface NavSection {
  id: "main" | "financial" | "revenue-distribution" | "reports" | "administration" | "settings";
  label: string;
  items: NavItem[];
}

export function getNavSections(user: SessionUser): NavSection[] {
  const sections: NavSection[] = [
    {
      id: "main",
      label: "Main",
      items: [{ label: "Dashboard", href: resolveHomePath(user), icon: "dashboard" }],
    },
    { id: "financial", label: "Financial", items: financialItems(user) },
    {
      id: "revenue-distribution",
      label: "Revenue Distribution",
      items: revenueDistributionItems(user),
    },
    { id: "reports", label: "Reports", items: reportsItems(user) },
    { id: "administration", label: "Administration", items: administrationItems(user) },
    { id: "settings", label: "Settings", items: settingsItems(user) },
  ];

  return sections.filter((section) => section.items.length > 0);
}

function administrationItems(user: SessionUser): NavItem[] {
  const items: NavItem[] = [];
  if (user.role === ROLES.ORG_ADMIN) {
    items.push({ label: "Organization Profile", href: "/admin/profile", icon: "profile" });
    items.push({ label: "Faculties", href: "/admin/faculties", icon: "faculties" });
    items.push({ label: "Departments", href: "/admin/departments", icon: "departments" });
    items.push({
      label: "Academic Levels",
      href: "/admin/academic-levels",
      icon: "academic-levels",
    });
    items.push({
      label: "Student Categories",
      href: "/admin/student-categories",
      icon: "student-categories",
    });
    items.push({ label: "Student Lists", href: "/admin/students", icon: "students" });
    items.push({
      label: "Payment Periods",
      href: "/admin/payment-periods",
      icon: "payment-periods",
    });
    items.push({ label: "Users & Roles", href: "/admin/users", icon: "users" });
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    items.push({ label: "Organizations", href: "/super-admin/organizations", icon: "organizations" });
    items.push({ label: "Platform Users", href: "/super-admin/platform-users", icon: "users" });
  }
  return items;
}

function financialItems(user: SessionUser): NavItem[] {
  const items: NavItem[] = [];
  if (user.role === ROLES.ORG_ADMIN) {
    items.push({
      label: "Dues Configuration",
      href: "/admin/dues-configurations",
      icon: "dues",
    });
    items.push({ label: "Payment Records", href: "/admin/payments", icon: "payments" });
    items.push({
      label: "Duplicate Payment Review",
      href: "/admin/payments/duplicates",
      icon: "duplicate-review",
    });
    items.push({
      label: "Payment Monitoring",
      href: "/admin/payments/monitoring",
      icon: "monitoring",
    });
    items.push({
      label: "Payment Matching",
      href: "/admin/payment-matching",
      icon: "matching",
    });
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    items.push({ label: "Withdrawals", href: "/super-admin/withdrawals", icon: "withdrawals" });
  }
  if (
    user.role === ROLES.FACULTY_DEAN ||
    user.role === ROLES.DEPT_HOD ||
    user.role === ROLES.SUPER_ADMIN
  ) {
    items.push({ label: "Approval Queue", href: "/approvals", icon: "approvals" });
  }
  return items;
}

function revenueDistributionItems(user: SessionUser): NavItem[] {
  const items: NavItem[] = [];
  if (user.role === ROLES.ORG_ADMIN) {
    items.push({ label: "Revenue Rules", href: "/admin/revenue-rules", icon: "revenue" });
    items.push({
      label: "Revenue Deductions",
      href: "/admin/revenue-deductions",
      icon: "revenue",
    });
    items.push({ label: "Financial Ledger", href: "/admin/ledger", icon: "ledger" });
  }
  return items;
}

function reportsItems(user: SessionUser): NavItem[] {
  const items: NavItem[] = [];
  if (user.role === ROLES.ORG_ADMIN) {
    items.push({ label: "Collection Reports", href: "/admin/payments/reports", icon: "reports" });
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    items.push({ label: "Audit Logs", href: "/super-admin/audit-logs", icon: "audit" });
  }
  return items;
}

function settingsItems(user: SessionUser): NavItem[] {
  const items: NavItem[] = [
    { label: "Account settings", href: "/settings", icon: "settings" },
  ];
  if (user.role === ROLES.SUPER_ADMIN) {
    items.push({ label: "Platform Settings", href: "/super-admin/settings", icon: "settings" });
    items.push({ label: "Payment Configuration", href: "/super-admin/settings/payments", icon: "payments" });
    items.push({ label: "Revenue Rules", href: "/super-admin/settings/revenue-rules", icon: "revenue" });
  }
  return items;
}

export function getFlattenedNavItems(user: SessionUser): NavItem[] {
  return getNavSections(user).flatMap((section) => section.items);
}
