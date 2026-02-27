import { query } from "../db/pool.js";
import { logAudit } from "../services/auditService.js";

export const listAlerts = async (req, res) => {
  const { severity, acknowledged } = req.query;
  const filters = [];
  const values = [];

  if (severity) {
    values.push(severity);
    filters.push(`severity = $${values.length}`);
  }
  if (acknowledged !== undefined) {
    values.push(acknowledged === "true");
    filters.push(`acknowledged = $${values.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const alerts = await query(`SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT 200`, values);
  res.json(alerts.rows);
};

export const acknowledgeAlert = async (req, res) => {
  const { id } = req.params;
  const updated = await query(
    "UPDATE alerts SET acknowledged = true WHERE id = $1 RETURNING *",
    [id]
  );
  if (!updated.rows.length) return res.status(404).json({ message: "Alert not found" });
  await logAudit({ userId: req.user?.id, action: `ack_alert:${id}`, ip: req.ip });
  res.json(updated.rows[0]);
};
