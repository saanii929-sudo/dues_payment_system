import "@/lib/serverOnly";
import { connectToDatabase } from "./connection";
import { hashPassword } from "@/lib/auth/password";
import { ROLES, type Role as RoleKey } from "@/lib/permissions/roles";
import { Role, User, UserRole } from "@/models";
import type { RoleLevel } from "@/models/Role";

const ROLE_CATALOG: Array<{ key: RoleKey; label: string; level: RoleLevel; description: string }> = [
  {
    key: ROLES.SUPER_ADMIN,
    label: "Super Admin",
    level: "PLATFORM",
    description: "Manages the platform: organizations, org admins, and global configuration.",
  },
  {
    key: ROLES.ORG_ADMIN,
    label: "Organization Admin",
    level: "ORGANIZATION",
    description: "Configures an organization's structure, dues, and releases withdrawal funds.",
  },
  {
    key: ROLES.FACULTY_DEAN,
    label: "Faculty Dean",
    level: "FACULTY",
    description: "Approves withdrawal requests for a faculty.",
  },
  {
    key: ROLES.FACULTY_PRESIDENT,
    label: "Faculty President",
    level: "FACULTY",
    description: "Faculty-level executive oversight.",
  },
  {
    key: ROLES.FACULTY_TREASURER,
    label: "Faculty Treasurer",
    level: "FACULTY",
    description: "Requests withdrawals from the faculty wallet.",
  },
  {
    key: ROLES.DEPT_HOD,
    label: "Head of Department",
    level: "DEPARTMENT",
    description: "Approves withdrawal requests for a department.",
  },
  {
    key: ROLES.DEPT_PRESIDENT,
    label: "Department President",
    level: "DEPARTMENT",
    description: "Department-level executive oversight.",
  },
  {
    key: ROLES.DEPT_TREASURER,
    label: "Department Treasurer",
    level: "DEPARTMENT",
    description: "Requests withdrawals from the department wallet.",
  },
  {
    key: ROLES.STUDENT,
    label: "Student",
    level: "STUDENT",
    description: "Payer. Identified by index number, not a login account, in the current payment flow.",
  },
];

/** Idempotent — safe to re-run. Inserts the role catalog and, if none exists yet, a bootstrap Super Admin. */
export async function seed() {
  await connectToDatabase();

  for (const role of ROLE_CATALOG) {
    await Role.findOneAndUpdate(
      { key: role.key },
      { $setOnInsert: role },
      { upsert: true, new: true },
    );
  }
  console.log(`Seeded ${ROLE_CATALOG.length} roles.`);

  const existingSuperAdmin = await UserRole.findOne({
    roleKey: ROLES.SUPER_ADMIN,
    isActive: true,
  });

  if (existingSuperAdmin) {
    console.log("Super Admin already exists, skipping bootstrap user.");
    return;
  }

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD not set — skipping bootstrap Super Admin user.",
    );
    return;
  }

  const superAdminRole = await Role.findOne({ key: ROLES.SUPER_ADMIN });
  if (!superAdminRole) {
    throw new Error("Super Admin role missing from catalog after seeding — this should not happen.");
  }

  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $setOnInsert: { email, passwordHash, fullName: "Super Admin", mustResetPassword: true } },
    { upsert: true, new: true },
  );

  await UserRole.create({
    userId: user._id,
    roleId: superAdminRole._id,
    roleKey: ROLES.SUPER_ADMIN,
    isActive: true,
    assignedAt: new Date(),
  });

  console.log(`Bootstrap Super Admin created for ${email}.`);
}
