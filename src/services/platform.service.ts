import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import {
  PlatformSettings,
  PLATFORM_SETTINGS_ID,
  User,
  UserRole,
  type IPlatformSettings,
  type IPlatformRevenueSplit,
  type PaymentEnvironment,
} from "@/models";
import { assertCan } from "@/lib/permissions/can";
import { recordAudit } from "@/lib/audit/recordAudit";
import type { SessionUser } from "@/lib/permissions/roles";

export interface PlatformSettingsDTO {
  platformName: string;
  supportEmail: string;
  paymentEnvironment: PaymentEnvironment;
  defaultCurrency: string;
  cardPaymentsEnabled: boolean;
  mobileMoneyEnabled: boolean;
  defaultRevenueSplits: IPlatformRevenueSplit[];
}

function toDTO(doc: IPlatformSettings): PlatformSettingsDTO {
  return {
    platformName: doc.platformName,
    supportEmail: doc.supportEmail,
    paymentEnvironment: doc.paymentEnvironment,
    defaultCurrency: doc.defaultCurrency,
    cardPaymentsEnabled: doc.cardPaymentsEnabled,
    mobileMoneyEnabled: doc.mobileMoneyEnabled,
    defaultRevenueSplits: doc.defaultRevenueSplits.map((split) => ({
      beneficiaryType: split.beneficiaryType,
      percentageBps: split.percentageBps,
    })),
  };
}

/** Upserts the singleton on first read so the rest of the app never has to special-case "no settings yet". */
export async function getPlatformSettings(): Promise<PlatformSettingsDTO> {
  await connectToDatabase();
  const doc = await PlatformSettings.findByIdAndUpdate(
    PLATFORM_SETTINGS_ID,
    { $setOnInsert: { _id: PLATFORM_SETTINGS_ID } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return toDTO(doc);
}

export async function updatePlatformSettings(
  actor: SessionUser,
  updates: Partial<Omit<PlatformSettingsDTO, "defaultRevenueSplits">>,
): Promise<void> {
  assertCan(actor, "platform:manage");
  await connectToDatabase();
  await PlatformSettings.findByIdAndUpdate(
    PLATFORM_SETTINGS_ID,
    { ...updates, updatedById: actor.userId },
    { upsert: true, setDefaultsOnInsert: true },
  );
  await recordAudit({
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "platform.settings_updated",
    targetType: "PlatformSettings",
    targetId: PLATFORM_SETTINGS_ID,
    metadata: updates,
  });
}

export async function updateDefaultRevenueSplits(
  actor: SessionUser,
  splits: IPlatformRevenueSplit[],
): Promise<void> {
  assertCan(actor, "platform:manage");
  const sum = splits.reduce((total, split) => total + split.percentageBps, 0);
  if (sum !== 10000) {
    throw new Error("Revenue split percentages must sum to 100%.");
  }

  await connectToDatabase();
  await PlatformSettings.findByIdAndUpdate(
    PLATFORM_SETTINGS_ID,
    { defaultRevenueSplits: splits, updatedById: actor.userId },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await recordAudit({
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "platform.revenue_rules_updated",
    targetType: "PlatformSettings",
    targetId: PLATFORM_SETTINGS_ID,
    metadata: { splits },
  });
}

export interface PlatformUserSummary {
  userId: string;
  email: string;
  fullName: string;
  role: string | null;
  organizationName: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}

/** Every user on the platform, not just one organization's — Super Admin only. */
export async function listAllUsers(actor: SessionUser): Promise<PlatformUserSummary[]> {
  assertCan(actor, "platform:manage");
  await connectToDatabase();

  const [users, activeRoles] = await Promise.all([
    User.find().sort({ createdAt: -1 }),
    UserRole.find({ isActive: true }).populate<{ organizationId?: { name: string } }>(
      "organizationId",
    ),
  ]);

  const roleByUserId = new Map(activeRoles.map((role) => [role.userId.toString(), role]));

  return users.map((user) => {
    const role = roleByUserId.get(user._id.toString());
    return {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: role?.roleKey ?? null,
      organizationName: role?.organizationId?.name ?? null,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ?? null,
    };
  });
}
