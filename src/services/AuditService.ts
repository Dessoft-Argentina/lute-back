import { AuditLog } from '@src/models/AuditLog';

async function record(
  adminUserId: number | null,
  action: string,
  entity: string | null = null,
  entityId: string | null = null,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  try {
    await AuditLog.create({
      adminUserId,
      action,
      entity,
      entityId,
      metadata,
    } as Record<string, unknown>);
  } catch (error) {
    console.error('[AuditService] Failed to record audit log:', error);
  }
}

export default {
  record,
};
