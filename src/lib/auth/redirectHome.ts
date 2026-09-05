import { ROLES } from "@/lib/permissions/roles";
import type { SessionUser } from "@/lib/permissions/roles";

/** Where a signed-in user lands after login / when visiting "/". */
export function resolveHomePath(user: SessionUser): string {
  switch (user.role) {
    case ROLES.SUPER_ADMIN:
      return "/super-admin";
    case ROLES.ORG_ADMIN:
      return "/admin";
    case ROLES.FACULTY_DEAN:
    case ROLES.FACULTY_PRESIDENT:
    case ROLES.FACULTY_TREASURER:
      return user.facultyId ? `/faculty/${user.facultyId}` : "/login";
    case ROLES.DEPT_HOD:
    case ROLES.DEPT_PRESIDENT:
    case ROLES.DEPT_TREASURER:
      return user.departmentId ? `/department/${user.departmentId}` : "/login";
    default:
      return "/login";
  }
}
