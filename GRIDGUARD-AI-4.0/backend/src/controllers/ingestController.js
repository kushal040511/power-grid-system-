import { query } from "../db/pool.js";
import { predictTheft, predictTransformer, generateRiskScore } from "../services/aiService.js";
import { riskClass } from "../utils/risk.js";

export const ingestReading = async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (process.env.INGEST_API_KEY && apiKey !== process.env.INGEST_API_KEY) {
    return res.status(401).json({ message: "Invalid ingest key" });
  }

  const {
    meter_id,
    voltage,
    current,
    power,
    loss_percent = 5,
    temperature = 55,
    load_percent = 45
  } = req.body;

  const meterRes = await query("SELECT id, region_id, transformer_id FROM smart_meters WHERE id = $1", [meter_id]);
  const meter = meterRes.rows[0];
  if (!meter) return res.status(404).json({ message: "Meter not found" });

  const theftPrediction = await predictTheft({ voltage, current, power, loss_percent });
  const transformerPrediction = await predictTransformer({ temperature, load_percent });
  const riskScore = await generateRiskScore({
    theft_probability: theftPrediction.theft_probability,
    carbon_score: 70,
    transformer_risk: transformerPrediction.overload_risk * 100
  });

  const risk = riskClass(theftPrediction.theft_probability);

  const readingRes = await query(
    "INSERT INTO readings (meter_id, voltage, current, power, timestamp) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
    [meter.id, voltage, current, power]
  );

  await query(
    "INSERT INTO anomaly_reports (meter_id, anomaly_score, theft_probability, classification) VALUES ($1, $2, $3, $4)",
    [meter.id, theftPrediction.anomaly_score, theftPrediction.theft_probability, risk]
  );

  await query(
    "UPDATE transformers SET health_index = $1, load_percent = $2, temperature = $3, risk_level = $4 WHERE id = $5",
    [transformerPrediction.health_index, load_percent, temperature, risk, meter.transformer_id]
  );

  const regionUpdate = await query(
    "UPDATE regions SET theft_score = $1, loss_percent = $2, transformer_risk = $3, carbon_score = $4, last_updated = NOW() WHERE id = $5 RETURNING id AS region_id, name, theft_score, loss_percent, transformer_risk, carbon_score, last_updated",
    [
      riskScore.theft_score || theftPrediction.theft_probability,
      loss_percent,
      riskScore.transformer_risk || transformerPrediction.overload_risk * 100,
      riskScore.carbon_score || 70,
      meter.region_id
    ]
  );

  if (risk !== "green") {
    await query(
      "INSERT INTO alerts (region_id, severity, message, acknowledged) VALUES ($1, $2, $3, false)",
      [meter.region_id, risk === "red" ? "high" : "medium", `Anomaly detected for meter ${meter.id}`]
    );
  }

  const io = req.app.get("io");
  if (io) {
    io.emit("reading", readingRes.rows[0]);
    if (risk !== "green") io.emit("alert", { region_id: meter.region_id, risk });
    if (regionUpdate.rows?.[0]) io.emit("region:update", regionUpdate.rows[0]);
  }

  res.json({
    reading: readingRes.rows[0],
    theftPrediction,
    transformerPrediction,
    risk
  });
};
