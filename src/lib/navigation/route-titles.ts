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
  "/admin/payment-periods": {
    title: "Payment Periods",
    breadcrumb: ["Administration", "Payment Periods"],
  },
  "/admin/dues-configurations": {
    title: "Dues Configuration",
    breadcrumb: ["Financial", "Dues Configuration"],
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

/** Falls back to a generic title for dynamic segments (faculty/department/organization ids). */
export function getRouteTitle(pathname: string): RouteTitle {
  const exact = STATIC_ROUTES[pathname];
  if (exact) return exact;

  if (pathname.startsWith("/faculty/")) {
    return { title: "Faculty dashboard", breadcrumb: ["Faculty"] };
  }
  if (pathname.startsWith("/department/")) {
    return { title: "Department dashboard", breadcrumb: ["Department"] };
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

  return { title: "Dashboard", breadcrumb: ["Dashboard"] };
}
