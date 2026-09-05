import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { AuditLog } from "@/models";
import type { Role } from "@/lib/permissions/roles";

export interface RecordAuditInput {
  organizationId?: string;
  actorId?: string;
  actorRoleSnapshot?: Role;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: unknown;
  ipAddress?: string;
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await connectToDatabase();
    await AuditLog.create({
      organizationId: input.organizationId,
      actorId: input.actorId,
      actorRoleSnapshot: input.actorRoleSnapshot,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
    });
  } catch (error) {
    console.error("Failed to record audit log entry", input.action, error);
  }
}
