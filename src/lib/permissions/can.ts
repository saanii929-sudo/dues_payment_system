import type { SessionScope, SessionUser } from "./roles";
import { ROLES } from "./roles";
import { inDepartment, inFaculty, inOrganization, isSuperAdmin } from "./scope";

export type Capability =
  | "organization:manage"
  | "organization:administer"
  | "faculty:manage"
  | "department:manage"
  | "dues:configure"
  | "revenue:configure"
  | "payment:record"
  | "payment:refund"
  | "payment:view"
  | "ledger:adjust"
  | "faculty-dashboard:view"
  | "department-dashboard:view"
  | "withdrawal:request"
  | "withdrawal:approve"
  | "withdrawal:super-approve"
  | "funds:release"
  | "student-list:upload"
  | "report:view"
  | "user:manage"
  | "platform:manage";

type CapabilityRule = (user: SessionUser, resource?: SessionScope) => boolean;

const RULES: Record<Capability, CapabilityRule> = {
  "organization:manage": (user) => isSuperAdmin(user),
  "organization:administer": (user, resource) =>
    isSuperAdmin(user) ||
    (user.role === ROLES.ORG_ADMIN && inOrganization(user, resource?.organizationId ?? "")),
  "faculty:manage": (user, resource) =>
    isSuperAdmin(user) ||
    user.role === ROLES.ORG_ADMIN && inOrganization(user, resource?.organizationId ?? ""),
  "department:manage": (user, resource) =>
    resource ? inFaculty(user, resource) : false,
  "dues:configure": (user, resource) =>
    resource
      ? user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "")
      : false,
  "revenue:configure": (user, resource) =>
    resource
      ? user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "")
      : false,
  "payment:record": () => true, // student-initiated; verified server-side in the payment webhook, not by role
  "payment:refund": (user, resource) =>
    resource
      ? user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "")
      : false,
  "payment:view": (user, resource) =>
    resource
      ? user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "")
      : false,
  "ledger:adjust": (user, resource) =>
    resource
      ? user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "")
      : false,
  "faculty-dashboard:view": (user, resource) =>
    resource
      ? isSuperAdmin(user) ||
        (user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "")) ||
        ((user.role === ROLES.FACULTY_DEAN ||
          user.role === ROLES.FACULTY_PRESIDENT ||
          user.role === ROLES.FACULTY_TREASURER) &&
          inFaculty(user, resource))
      : false,
  "department-dashboard:view": (user, resource) =>
    resource
      ? isSuperAdmin(user) ||
        (user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "")) ||
        ((user.role === ROLES.DEPT_HOD ||
          user.role === ROLES.DEPT_PRESIDENT ||
          user.role === ROLES.DEPT_TREASURER) &&
          inDepartment(user, resource))
      : false,
  "withdrawal:request": (user, resource) =>
    resource
      ? ((user.role === ROLES.FACULTY_TREASURER || user.role === ROLES.FACULTY_PRESIDENT) &&
          inFaculty(user, resource)) ||
        ((user.role === ROLES.DEPT_TREASURER || user.role === ROLES.DEPT_PRESIDENT) &&
          inDepartment(user, resource))
      : false,
  "withdrawal:approve": (user, resource) =>
    resource
      ? (user.role === ROLES.FACULTY_DEAN && inFaculty(user, resource)) ||
        (user.role === ROLES.DEPT_HOD && inDepartment(user, resource))
      : false,
  "withdrawal:super-approve": (user) => isSuperAdmin(user),
  "funds:release": (user) => isSuperAdmin(user),
  "student-list:upload": (user, resource) =>
    resource ? user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "") : false,
  "report:view": (user, resource) => (resource ? inDepartment(user, resource) : false),
  "user:manage": (user, resource) =>
    isSuperAdmin(user) ||
    (user.role === ROLES.ORG_ADMIN && inOrganization(user, resource?.organizationId ?? "")),
  "platform:manage": (user) => isSuperAdmin(user),
};

export function can(
  user: SessionUser,
  capability: Capability,
  resource?: SessionScope,
): boolean {
  return RULES[capability](user, resource);
}

export class ForbiddenError extends Error {
  constructor(capability: Capability) {
    super(`Not authorized to perform "${capability}".`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(
  user: SessionUser,
  capability: Capability,
  resource?: SessionScope,
): void {
  if (!can(user, capability, resource)) {
    throw new ForbiddenError(capability);
  }
}
