import type { SessionScope, SessionUser } from "./roles";
import { ROLES } from "./roles";

export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === ROLES.SUPER_ADMIN;
}

export function inOrganization(
  user: SessionUser,
  organizationId: string,
): boolean {
  return isSuperAdmin(user) || user.organizationId === organizationId;
}

export function inFaculty(user: SessionUser, resource: SessionScope): boolean {
  if (isSuperAdmin(user)) return true;
  if (!resource.organizationId || user.organizationId !== resource.organizationId) {
    return false;
  }
  // Org admins see every faculty within their own organization.
  if (user.role === ROLES.ORG_ADMIN) return true;
  return Boolean(user.facultyId) && user.facultyId === resource.facultyId;
}

export function inDepartment(
  user: SessionUser,
  resource: SessionScope,
): boolean {
  if (isSuperAdmin(user)) return true;
  if (!resource.organizationId || user.organizationId !== resource.organizationId) {
    return false;
  }
  if (user.role === ROLES.ORG_ADMIN) return true;
  if (
    resource.facultyId &&
    user.facultyId === resource.facultyId &&
    (user.role === ROLES.FACULTY_DEAN ||
      user.role === ROLES.FACULTY_PRESIDENT ||
      user.role === ROLES.FACULTY_TREASURER)
  ) {
    return true;
  }
  return Boolean(user.departmentId) && user.departmentId === resource.departmentId;
}
