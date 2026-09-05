import type { SessionScope, SessionUser } from "./roles";
import { ROLES } from "./roles";
import { inDepartment, inFaculty, inOrganization, isSuperAdmin } from "./scope";

export type Capability =
  | "organization:manage"
  | "organization:administer"
  | "faculty:manage"
  | "department:manage"
  | "dues:configure"
  | "payment:record"
  | "withdrawal:request"
  | "withdrawal:approve"
  | "funds:release"
  | "student-list:upload"
  | "report:view"
  | "user:manage"
  | "platform:manage";

type CapabilityRule = (user: SessionUser, resource?: SessionScope) => boolean;

const RULES: Record<Capability, CapabilityRule> = {
  "organization:manage": (user) => isSuperAdmin(user),
  // Org Admin's authority over their OWN org's structure/profile — kept
  // distinct from organization:manage, which gates Super-Admin-only actions
  // (deactivating an org, assigning/revoking its Org Admin). Broadening
  // organization:manage instead would let an Org Admin deactivate their own
  // organization or revoke a peer Org Admin. See ARCHITECTURE.md Phase 5.
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
  "payment:record": () => true, // student-initiated; verified server-side in the payment webhook, not by role
  "withdrawal:request": (user, resource) =>
    resource
      ? (user.role === ROLES.FACULTY_TREASURER && inFaculty(user, resource)) ||
        (user.role === ROLES.DEPT_TREASURER && inDepartment(user, resource))
      : false,
  "withdrawal:approve": (user, resource) =>
    resource
      ? (user.role === ROLES.FACULTY_DEAN && inFaculty(user, resource)) ||
        (user.role === ROLES.DEPT_HOD && inDepartment(user, resource))
      : false,
  "funds:release": (user, resource) =>
    resource ? user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "") : false,
  "student-list:upload": (user, resource) =>
    resource ? user.role === ROLES.ORG_ADMIN && inOrganization(user, resource.organizationId ?? "") : false,
  "report:view": (user, resource) => (resource ? inDepartment(user, resource) : false),
  "user:manage": (user, resource) =>
    isSuperAdmin(user) ||
    (user.role === ROLES.ORG_ADMIN && inOrganization(user, resource?.organizationId ?? "")),
  // Genuinely platform-wide actions (platform users, audit logs, platform
  // settings) — same check as organization:manage today, kept distinct so
  // call sites stay self-documenting if a narrower platform-support role
  // is ever introduced.
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

/**
 * Throws ForbiddenError when the capability check fails. Call this at the
 * top of every Server Action / service function that mutates or reads
 * scoped data — a page or route being "protected" upstream is never
 * sufficient on its own, per the Next.js data-security guidance referenced
 * in ARCHITECTURE.md.
 */
export function assertCan(
  user: SessionUser,
  capability: Capability,
  resource?: SessionScope,
): void {
  if (!can(user, capability, resource)) {
    throw new ForbiddenError(capability);
  }
}
