import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { AuditLog } from "@/models";
import { assertCan } from "@/lib/permissions/can";
import type { SessionUser } from "@/lib/permissions/roles";

export interface AuditLogSummary {
  id: string;
  organizationId: string | null;
  actorEmail: string | null;
  actorRoleSnapshot: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: Date;
}

/** Plain recent-N list, newest first — see ARCHITECTURE.md Phase 4 on why this isn't paginated yet. */
export async function listRecentAuditLogs(
  actor: SessionUser,
  limit = 200,
): Promise<AuditLogSummary[]> {
  assertCan(actor, "platform:manage");
  await connectToDatabase();
  return queryAuditLogs({}, limit);
}

/** Same shape, scoped to one organization — Org Admin's recent-activity feed. */
export async function listOrganizationAuditLogs(
  actor: SessionUser,
  organizationId: string,
  limit = 50,
): Promise<AuditLogSummary[]> {
  assertCan(actor, "organization:administer", { organizationId });
  await connectToDatabase();
  return queryAuditLogs({ organizationId }, limit);
}

async function queryAuditLogs(
  filter: Record<string, unknown>,
  limit: number,
): Promise<AuditLogSummary[]> {
  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate<{ actorId?: { email: string } }>("actorId", "email");

  return logs.map((log) => ({
    id: log._id.toString(),
    organizationId: log.organizationId?.toString() ?? null,
    actorEmail: log.actorId?.email ?? null,
    actorRoleSnapshot: log.actorRoleSnapshot ?? null,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId?.toString() ?? null,
    createdAt: log.createdAt,
  }));
}
