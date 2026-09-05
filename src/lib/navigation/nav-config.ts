import { ROLES } from "@/lib/permissions/roles";
import { resolveHomePath } from "@/lib/auth/redirectHome";
import type { SessionUser } from "@/lib/permissions/roles";

/**
 * String keys, not component references — this module is imported from both
 * server components (Sidebar) and client components (NavSearch), and a raw
 * component reference does not survive the server/client boundary. The
 * actual icon components are looked up from this key in nav-content.tsx,
 * the one client file that needs them.
 */
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
  | "dues";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconKey;
}

export interface NavSection {
  id: "main" | "financial" | "reports" | "administration" | "settings";
  label: string;
  items: NavItem[];
}

/**
 * Financial and Reports sections are defined here as first-class section
 * types but only render once they actually have an item for this role (see
 * ARCHITECTURE.md "The nav is real, not padded with stub links"). Phase 5
 * gives ORG_ADMIN's Financial section its first-ever item (Dues
 * Configuration), left empty since Phase 3.
 */
export function getNavSections(user: SessionUser): NavSection[] {
  const sections: NavSection[] = [
    {
      id: "main",
      label: "Main",
      items: [{ label: "Dashboard", href: resolveHomePath(user), icon: "dashboard" }],
    },
    { id: "financial", label: "Financial", items: financialItems(user) },
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
  }
  return items;
}

function reportsItems(user: SessionUser): NavItem[] {
  const items: NavItem[] = [];
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
