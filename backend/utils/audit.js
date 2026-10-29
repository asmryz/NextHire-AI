// backend/utils/audit.js
// Owner: Aarian (everyone can use it)
// Writes one row to audit_log so every important action is traceable (SRS traceability).
//   await logAudit(db, req.user.user_id, 'vacancy', vacancyId, 'PUBLISH', 'Frontend Developer');
// `db` can be the pool or a transaction client.
async function logAudit(db, userId, entityType, entityId, action, details = null) {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, entity_type, entity_id, action, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, entityType, entityId || null, action, details]
    );
  } catch (err) {
    // An audit failure must never break the real action
    console.error('audit_log failed:', err.message);
  }
}

module.exports = { logAudit };
