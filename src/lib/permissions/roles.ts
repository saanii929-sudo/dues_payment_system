export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  FACULTY_DEAN: "FACULTY_DEAN",
  FACULTY_PRESIDENT: "FACULTY_PRESIDENT",
  FACULTY_TREASURER: "FACULTY_TREASURER",
  DEPT_HOD: "DEPT_HOD",
  DEPT_PRESIDENT: "DEPT_PRESIDENT",
  DEPT_TREASURER: "DEPT_TREASURER",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PLATFORM_ROLES: Role[] = [ROLES.SUPER_ADMIN];
export const ORG_ROLES: Role[] = [ROLES.ORG_ADMIN];
export const FACULTY_ROLES: Role[] = [
  ROLES.FACULTY_DEAN,
  ROLES.FACULTY_PRESIDENT,
  ROLES.FACULTY_TREASURER,
];
export const DEPARTMENT_ROLES: Role[] = [
  ROLES.DEPT_HOD,
  ROLES.DEPT_PRESIDENT,
  ROLES.DEPT_TREASURER,
];

export interface SessionScope {
  organizationId?: string;
  facultyId?: string;
  departmentId?: string;
}

export interface SessionUser extends SessionScope {
  userId: string;
  role: Role;
}
