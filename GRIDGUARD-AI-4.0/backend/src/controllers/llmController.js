import { query } from "../db/pool.js";
import { chatReply, explainRisk, executiveSummary } from "../services/llmService.js";

const normalize = (s) => s.toLowerCase();

const tryFindRegion = async (question) => {
  const rows = await query("SELECT id, name, theft_score, loss_percent, transformer_risk, carbon_score FROM regions");
  const q = normalize(question);
  return rows.rows.find((r) => q.includes(r.name.toLowerCase())) || null;
};

const buildSummaryText = ({ region, alerts }) => {
  return `Region: ${region.name}\nTheft score: ${Math.round(Number(region.theft_score || 0))}\nLoss%: ${Math.round(Number(region.loss_percent || 0))}\nTransformer risk: ${Math.round(Number(region.transformer_risk || 0))}\nCarbon score: ${Math.round(Number(region.carbon_score || 0))}\nRecent alerts: ${alerts.length}`;
};

export const explainRegion = async (req, res) => {
  const { regionId, regionName } = req.body;
  let region;
  if (regionId) {
    const r = await query("SELECT * FROM regions WHERE id = $1", [regionId]);
    region = r.rows[0];
  } else if (regionName) {
    const r = await query("SELECT * FROM regions WHERE LOWER(name) = LOWER($1)", [regionName]);
    region = r.rows[0];
  }

  if (!region) return res.status(404).json({ message: "Region not found" });

  const alerts = await query("SELECT * FROM alerts WHERE region_id = $1 ORDER BY created_at DESC LIMIT 5", [region.id]);
  const analysis = await explainRisk({ region: region.name, metrics: region, alerts: alerts.rows });
  res.json({ text: analysis.technical_summary, analysis });
};

export const chat = async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ message: "question required" });

  const q = normalize(question);

  if (q.includes("why") && q.includes("red")) {
    const region = (await tryFindRegion(question)) || (await query("SELECT * FROM regions ORDER BY theft_score DESC LIMIT 1")).rows[0];
    if (!region) return res.json({ type: "chat", data: "No region data available yet." });

    const alerts = await query("SELECT * FROM alerts WHERE region_id = $1 ORDER BY created_at DESC LIMIT 5", [region.id]);
    const analysis = await explainRisk({ region: region.name, metrics: region, alerts: alerts.rows });
    return res.json({ type: "explanation", data: analysis });
  }

  if (q.includes("top") && q.includes("transformer")) {
    const rows = await query(
      `SELECT t.id, t.capacity, t.health_index, t.load_percent, t.temperature, t.risk_level, r.name AS region
       FROM transformers t
       LEFT JOIN regions r ON r.id = t.region_id
       ORDER BY t.health_index ASC NULLS LAST, t.load_percent DESC NULLS LAST
       LIMIT 5`
    );
    return res.json({ type: "transformers", data: rows.rows });
  }

  if (q.includes("top") && q.includes("meter")) {
    const rows = await query(
      `SELECT sm.id, sm.status, r.name AS region, ar.theft_probability, ar.classification, ar.created_at
       FROM anomaly_reports ar
       JOIN smart_meters sm ON sm.id = ar.meter_id
       LEFT JOIN regions r ON r.id = sm.region_id
       ORDER BY ar.theft_probability DESC NULLS LAST
       LIMIT 5`
    );
    return res.json({ type: "meters", data: rows.rows });
  }

  if (q.includes("next week") && q.includes("loss")) {
    const trend = await query(
      `SELECT DATE(timestamp) AS day, AVG(power) AS avg_power
       FROM readings
       WHERE timestamp >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(timestamp)
       ORDER BY day`
    );

    const regionStats = await query("SELECT AVG(loss_percent) AS avg_loss FROM regions");
    const avgLoss = Number(regionStats.rows[0]?.avg_loss || 0);
    const projected = Math.max(0, Math.round(avgLoss + 2));
    return res.json({
      type: "forecast",
      data: {
        projected_loss_percent: projected,
        basis: "7-day trailing average + trend uplift",
        points: trend.rows
      }
    });
  }

  if (q.includes("executive summary") || q.includes("summary")) {
    const statsRes = await query(
      `SELECT AVG(loss_percent) AS loss, AVG(carbon_score) AS carbon, AVG(transformer_risk) AS transformer_risk,
              AVG(theft_score) AS theft_score
       FROM regions`
    );
    const summary = await executiveSummary({ stats: statsRes.rows[0] });
    return res.json({ type: "summary", data: summary });
  }

  const region = await tryFindRegion(question);
  if (region) {
    const alerts = await query("SELECT * FROM alerts WHERE region_id = $1 ORDER BY created_at DESC LIMIT 5", [region.id]);
    const contextText = buildSummaryText({ region, alerts: alerts.rows });
    const reply = await chatReply({
      question,
      context: { region, alerts: alerts.rows, summary: contextText }
    });
    return res.json({ type: "chat", data: reply });
  }

  const context = {
    topRegions: (await query("SELECT name, theft_score, loss_percent FROM regions ORDER BY theft_score DESC LIMIT 5")).rows,
    topAlerts: (await query("SELECT severity, message, created_at FROM alerts ORDER BY created_at DESC LIMIT 5")).rows
  };
  const reply = await chatReply({ question, context });
  return res.json({ type: "chat", data: reply });
};
