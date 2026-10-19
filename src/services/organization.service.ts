import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import {
  Organization,
  Faculty,
  Department,
  Student,
  RevenueAllocationRule,
  AcademicLevel,
  StudentCategory,
} from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import { setEntityActive } from "@/lib/db/scoped-activation";
import { getPlatformSettings } from "./platform.service";
import {
  assignRole,
  revokeRoleAssignment,
  listOrganizationRoleAssignments,
} from "./role-assignment.service";
import { ROLES } from "@/lib/permissions/roles";
import type { SessionUser } from "@/lib/permissions/roles";

export class OrganizationError extends Error {}

export interface OrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
}

const DEFAULT_ACADEMIC_LEVELS = ["100", "200", "300", "400"];
const DEFAULT_STUDENT_CATEGORIES = [
  { name: "Fresher", code: "FRESHER" },
  { name: "Continuing", code: "CONTINUING" },
  { name: "Top-up", code: "TOPUP" },
];

export async function createOrganization(
  actor: SessionUser,
  input: CreateOrganizationInput,
): Promise<OrganizationSummary> {
  assertCan(actor, "organization:manage");
  await connectToDatabase();

  const slug = input.slug.toLowerCase().trim();
  const existing = await Organization.findOne({ slug });
  if (existing) {
    throw new OrganizationError("An organization with this slug already exists.");
  }

  const organization = await Organization.create({
    name: input.name.trim(),
    slug,
    contactEmail: input.contactEmail.toLowerCase().trim(),
    contactPhone: input.contactPhone,
    address: input.address,
    createdById: actor.userId,
  });

  const settings = await getPlatformSettings();
  const defaultFacultyBps =
    settings.defaultRevenueSplits.find((split) => split.beneficiaryType === "FACULTY")
      ?.percentageBps ?? 3000;
  await RevenueAllocationRule.create({
    organizationId: organization._id,
    name: "Default revenue split",
    facultyShareType: "PERCENTAGE",
    facultyShareBps: defaultFacultyBps,
    priority: 0,
    createdById: actor.userId,
  });

  await AcademicLevel.insertMany(
    DEFAULT_ACADEMIC_LEVELS.map((code, index) => ({
      organizationId: organization._id,
      name: `${code} Level`,
      code,
      sortOrder: index,
      createdById: actor.userId,
    })),
  );

  await StudentCategory.insertMany(
    DEFAULT_STUDENT_CATEGORIES.map((category, index) => ({
      organizationId: organization._id,
      name: category.name,
      code: category.code,
      sortOrder: index,
      createdById: actor.userId,
    })),
  );

  await recordAudit({
    organizationId: organization._id.toString(),
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "organization.created",
    targetType: "Organization",
    targetId: organization._id.toString(),
  });

  return {
    organizationId: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
    contactEmail: organization.contactEmail,
    contactPhone: organization.contactPhone ?? null,
    address: organization.address ?? null,
    logoUrl: organization.logoUrl ?? null,
    isActive: organization.isActive,
    createdAt: organization.createdAt,
  };
}


export async function getPublicOrganizationBySlug(
  slug: string,
): Promise<OrganizationSummary | null> {
  await connectToDatabase();

  const organization = await Organization.findOne({ slug, isActive: true });
  if (!organization) {
    return null;
  }

  return {
    organizationId: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
    contactEmail: organization.contactEmail,
    contactPhone: organization.contactPhone ?? null,
    address: organization.address ?? null,
    logoUrl: organization.logoUrl ?? null,
    isActive: organization.isActive,
    createdAt: organization.createdAt,
  };
}

export async function listOrganizations(actor: SessionUser): Promise<OrganizationSummary[]> {
  assertCan(actor, "organization:manage");
  await connectToDatabase();

  const organizations = await Organization.find().sort({ createdAt: -1 });
  return organizations.map((org) => ({
    organizationId: org._id.toString(),
    name: org.name,
    slug: org.slug,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone ?? null,
    address: org.address ?? null,
    logoUrl: org.logoUrl ?? null,
    isActive: org.isActive,
    createdAt: org.createdAt,
  }));
}

export interface OrganizationDetails extends OrganizationSummary {
  facultyCount: number;
  departmentCount: number;
  studentCount: number;
}

export async function getOrganizationDetails(
  actor: SessionUser,
  organizationId: string,
): Promise<OrganizationDetails> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const [organization, facultyCount, departmentCount, studentCount] = await Promise.all([
    Organization.findById(organizationId),
    Faculty.countDocuments({ organizationId }),
    Department.countDocuments({ organizationId }),
    Student.countDocuments({ organizationId }),
  ]);

  if (!organization) {
    throw new OrganizationError("Organization not found.");
  }

  return {
    organizationId: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
    contactEmail: organization.contactEmail,
    contactPhone: organization.contactPhone ?? null,
    address: organization.address ?? null,
    logoUrl: organization.logoUrl ?? null,
    isActive: organization.isActive,
    createdAt: organization.createdAt,
    facultyCount,
    departmentCount,
    studentCount,
  };
}

async function setOrganizationActive(
  actor: SessionUser,
  organizationId: string,
  isActive: boolean,
): Promise<void> {
  assertCan(actor, "organization:manage");
  await connectToDatabase();

  const updated = await setEntityActive(Organization, organizationId, isActive, actor.userId);
  if (!updated) {
    throw new OrganizationError("Organization not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: isActive ? "organization.reactivated" : "organization.deactivated",
    targetType: "Organization",
    targetId: organizationId,
  });
}

export async function deactivateOrganization(
  actor: SessionUser,
  organizationId: string,
): Promise<void> {
  await setOrganizationActive(actor, organizationId, false);
}

export async function reactivateOrganization(
  actor: SessionUser,
  organizationId: string,
): Promise<void> {
  await setOrganizationActive(actor, organizationId, true);
}

export interface UpdateOrganizationProfileInput {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
}

export async function updateOrganizationProfile(
  actor: SessionUser,
  organizationId: string,
  input: UpdateOrganizationProfileInput,
): Promise<void> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();

  const updated = await Organization.findByIdAndUpdate(organizationId, {
    name: input.name.trim(),
    contactEmail: input.contactEmail.toLowerCase().trim(),
    contactPhone: input.contactPhone,
    address: input.address,
    updatedById: actor.userId,
  });

  if (!updated) {
    throw new OrganizationError("Organization not found.");
  }

  await recordAudit({
    organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "organization.profile_updated",
    targetType: "Organization",
    targetId: organizationId,
  });
}

export interface OrgAdminSummary {
  userRoleId: string;
  userId: string;
  email: string;
  fullName: string;
  assignedAt: Date;
}

export async function listOrgAdmins(
  actor: SessionUser,
  organizationId: string,
): Promise<OrgAdminSummary[]> {
  const assignments = await listOrganizationRoleAssignments(actor, organizationId);
  return assignments
    .filter((assignment) => assignment.role === ROLES.ORG_ADMIN)
    .map((assignment) => ({
      userRoleId: assignment.userRoleId,
      userId: assignment.userId,
      email: assignment.email,
      fullName: assignment.fullName,
      assignedAt: assignment.assignedAt,
    }));
}

export interface AssignOrgAdminInput {
  email: string;
  fullName: string;
}

export async function assignOrgAdmin(
  actor: SessionUser,
  organizationId: string,
  input: AssignOrgAdminInput,
  appBaseUrl: string,
): Promise<void> {
  await assignRole(actor, organizationId, { ...input, role: ROLES.ORG_ADMIN }, appBaseUrl);
}

export async function revokeOrgAdmin(actor: SessionUser, userRoleId: string): Promise<void> {
  await revokeRoleAssignment(actor, userRoleId);
}
