export interface RouteTitle {
  title: string;
  breadcrumb: string[];
}

const STATIC_ROUTES: Record<string, RouteTitle> = {
  "/super-admin": { title: "Dashboard", breadcrumb: ["Dashboard"] },
  "/admin": { title: "Dashboard", breadcrumb: ["Dashboard"] },
  "/admin/users": { title: "Users & Roles", breadcrumb: ["Administration", "Users & Roles"] },
  "/admin/profile": { title: "Organization Profile", breadcrumb: ["Administration", "Profile"] },
  "/admin/faculties": { title: "Faculties", breadcrumb: ["Administration", "Faculties"] },
  "/admin/departments": { title: "Departments", breadcrumb: ["Administration", "Departments"] },
  "/admin/academic-levels": {
    title: "Academic Levels",
    breadcrumb: ["Administration", "Academic Levels"],
  },
  "/admin/student-categories": {
    title: "Student Categories",
    breadcrumb: ["Administration", "Student Categories"],
  },
  "/admin/students": { title: "Student Lists", breadcrumb: ["Administration", "Student Lists"] },
  "/admin/payment-matching": {
    title: "Payment Matching",
    breadcrumb: ["Financial", "Payment Matching"],
  },
  "/admin/payment-periods": {
    title: "Payment Periods",
    breadcrumb: ["Administration", "Payment Periods"],
  },
  "/admin/dues-configurations": {
    title: "Dues Configuration",
    breadcrumb: ["Financial", "Dues Configuration"],
  },
  "/admin/payments": { title: "Payment Records", breadcrumb: ["Financial", "Payment Records"] },
  "/admin/payments/duplicates": {
    title: "Duplicate Payment Review",
    breadcrumb: ["Financial", "Duplicate Payment Review"],
  },
  "/admin/payments/monitoring": {
    title: "Payment Monitoring",
    breadcrumb: ["Financial", "Payment Monitoring"],
  },
  "/admin/payments/reports": {
    title: "Collection Reports",
    breadcrumb: ["Reports", "Collection Reports"],
  },
  "/admin/revenue-rules": {
    title: "Revenue Rules",
    breadcrumb: ["Revenue Distribution", "Revenue Rules"],
  },
  "/admin/revenue-deductions": {
    title: "Revenue Deductions",
    breadcrumb: ["Revenue Distribution", "Revenue Deductions"],
  },
  "/admin/ledger": {
    title: "Financial Ledger",
    breadcrumb: ["Revenue Distribution", "Financial Ledger"],
  },
  "/settings": { title: "Account settings", breadcrumb: ["Settings"] },
  "/super-admin/organizations": {
    title: "Organizations",
    breadcrumb: ["Administration", "Organizations"],
  },
  "/super-admin/platform-users": {
    title: "Platform Users",
    breadcrumb: ["Administration", "Platform Users"],
  },
  "/super-admin/audit-logs": { title: "Audit Logs", breadcrumb: ["Reports", "Audit Logs"] },
  "/super-admin/withdrawals": {
    title: "Withdrawals",
    breadcrumb: ["Financial", "Withdrawals"],
  },
  "/approvals": { title: "Approval Queue", breadcrumb: ["Financial", "Approval Queue"] },
  "/super-admin/settings": { title: "Platform Settings", breadcrumb: ["Settings", "Platform"] },
  "/super-admin/settings/payments": {
    title: "Payment Configuration",
    breadcrumb: ["Settings", "Payment Configuration"],
  },
  "/super-admin/settings/revenue-rules": {
    title: "Revenue Rules",
    breadcrumb: ["Settings", "Revenue Rules"],
  },
};

export function getRouteTitle(pathname: string): RouteTitle {
  const exact = STATIC_ROUTES[pathname];
  if (exact) return exact;

  if (pathname.startsWith("/faculty/")) {
    return { title: "Financial Dashboard", breadcrumb: ["Faculty", "Financial Dashboard"] };
  }
  if (pathname.startsWith("/department/")) {
    return { title: "Financial Dashboard", breadcrumb: ["Department", "Financial Dashboard"] };
  }
  if (pathname.startsWith("/super-admin/organizations/")) {
    if (pathname.endsWith("/admins")) {
      return { title: "Organization Admins", breadcrumb: ["Organizations", "Admins"] };
    }
    return { title: "Organization Details", breadcrumb: ["Organizations", "Details"] };
  }
  if (pathname.startsWith("/admin/faculties/")) {
    return { title: "Faculty Details", breadcrumb: ["Faculties", "Details"] };
  }
  if (pathname.startsWith("/admin/departments/")) {
    return { title: "Department Details", breadcrumb: ["Departments", "Details"] };
  }
  if (pathname.startsWith("/admin/payment-periods/")) {
    return { title: "Payment Period Details", breadcrumb: ["Payment Periods", "Details"] };
  }
  if (pathname.startsWith("/admin/payments/")) {
    return { title: "Payment Details", breadcrumb: ["Payment Records", "Details"] };
  }
  if (pathname.startsWith("/admin/students/")) {
    return { title: "Student List Upload", breadcrumb: ["Student Lists", "Details"] };
  }
  if (pathname.startsWith("/admin/payment-matching/")) {
    return { title: "Matching Results", breadcrumb: ["Payment Matching", "Results"] };
  }

  return { title: "Dashboard", breadcrumb: ["Dashboard"] };
}
