import { query } from "../db/pool.js";
import { getRedis } from "../services/redis.js";

export const getDashboard = async (req, res) => {
  const lossRes = await query("SELECT COALESCE(AVG(loss_percent), 0) AS loss FROM regions");
  const alertsRes = await query("SELECT COUNT(*)::int AS active FROM alerts WHERE acknowledged = false");
  const transformersRes = await query(
    "SELECT COUNT(*)::int AS risky FROM transformers WHERE risk_level <> 'green' OR health_index < 0.7"
  );
  const carbonRes = await query("SELECT COALESCE(AVG(carbon_score), 0) AS carbon FROM regions");
  const alerts = await query("SELECT * FROM alerts ORDER BY created_at DESC LIMIT 10");

  res.json({
    lossPct: Math.round(Number(lossRes.rows[0].loss || 0)),
    activeTheftCases: alertsRes.rows[0].active,
    transformersAtRisk: transformersRes.rows[0].risky,
    carbonOptimizationScore: Math.round(Number(carbonRes.rows[0].carbon || 0)),
    liveAlerts: alerts.rows
  });
};

export const getRiskMap = async (req, res) => {
  const redis = await getRedis();
  if (redis) {
    const cached = await redis.get("risk_map");
    if (cached) return res.json(JSON.parse(cached));
  }

  const regions = await query(
    "SELECT id as region_id, name, theft_score, loss_percent, transformer_risk, carbon_score, last_updated FROM regions"
  );
  const payload = { regions: regions.rows };
  if (redis) await redis.setEx("risk_map", 5, JSON.stringify(payload));
  res.json(payload);
};
