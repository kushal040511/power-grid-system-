import dotenv from "dotenv";
import { query } from "../src/db/pool.js";

dotenv.config();

const classify = (theftProbability) => {
  if (theftProbability > 70) return "red";
  if (theftProbability >= 40) return "yellow";
  return "green";
};

const run = async () => {
  const regions = await query("SELECT id, name, theft_score FROM regions ORDER BY name");
  let inserted = 0;

  await query("BEGIN");
  try {
    for (const region of regions.rows) {
      const meterRes = await query(
        "SELECT id FROM smart_meters WHERE region_id = $1 ORDER BY id LIMIT 1",
        [region.id]
      );
      const meter = meterRes.rows[0];
      if (!meter) continue;

      for (let i = 0; i < 8; i += 1) {
        const offsetMinutes = 8 - i;
        const voltage = Number((220 + Math.random() * 20).toFixed(3));
        const current = Number((7 + Math.random() * 8).toFixed(3));
        const power = Number((1 + Math.random() * 6).toFixed(3));

        const baseTheft = Number(region.theft_score || 20);
        const theftProbability = Math.max(
          1,
          Math.min(99, Number((baseTheft + (Math.random() * 20 - 10)).toFixed(2)))
        );
        const anomalyScore = Number(Math.random().toFixed(3));
        const classification = classify(theftProbability);

        await query(
          `INSERT INTO readings (meter_id, voltage, current, power, timestamp)
           VALUES ($1, $2, $3, $4, NOW() - ($5 || ' minutes')::interval)`,
          [meter.id, voltage, current, power, String(offsetMinutes)]
        );

        await query(
          `INSERT INTO anomaly_reports (meter_id, anomaly_score, theft_probability, classification, created_at)
           VALUES ($1, $2, $3, $4, NOW() - ($5 || ' minutes')::interval)`,
          [meter.id, anomalyScore, theftProbability, classification, String(offsetMinutes)]
        );
        inserted += 1;
      }
    }

    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }

  console.log(JSON.stringify({ regions: regions.rows.length, inserted_readings: inserted }, null, 2));
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

