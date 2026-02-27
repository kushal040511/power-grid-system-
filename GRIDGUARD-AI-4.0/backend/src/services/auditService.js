import { query } from "../db/pool.js";

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );

export const logAudit = async ({ userId, action, ip }) => {
  if (!action) return;
  await query(
    "INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)",
    [isUuid(userId) ? userId : null, action, ip || null]
  );
};
