import AdminAuditLog from '../models/AdminAuditLog.js';

export async function writeAdminAuditLog({ actor, action, entityType, entityId, metadata = {} }) {
  if (!actor || !action || !entityType || !entityId) {
    return;
  }
  await AdminAuditLog.create({
    actor,
    action,
    entityType,
    entityId: String(entityId),
    metadata,
  });
}
