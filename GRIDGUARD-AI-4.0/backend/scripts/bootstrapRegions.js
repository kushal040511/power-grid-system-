import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { query } from "../src/db/pool.js";

dotenv.config();

const GEOJSON_PATH = path.resolve("../frontend/public/data/india.geo.json");

const pickStateName = (feature) =>
  feature?.properties?.NAME_1 ||
  feature?.properties?.name ||
  feature?.properties?.st_nm ||
  feature?.properties?.state ||
  null;

const regionRisk = (theftScore, transformerRisk) => {
  if (theftScore > 70 || transformerRisk > 80) return "red";
  if (theftScore >= 40 || transformerRisk >= 60) return "yellow";
  return "green";
};

const rand = (min, max) => Math.random() * (max - min) + min;

const run = async () => {
  if (!fs.existsSync(GEOJSON_PATH)) {
    throw new Error(`GeoJSON not found: ${GEOJSON_PATH}`);
  }

  const geo = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
  const names = Array.from(
    new Set(
      (geo.features || [])
        .map((f) => pickStateName(f))
        .filter(Boolean)
        .map((n) => String(n).trim())
    )
  );

  if (!names.length) {
    throw new Error("No states found in India GeoJSON");
  }

  let insertedRegions = 0;
  let insertedTransformers = 0;
  let insertedMeters = 0;

  await query("BEGIN");
  try {
    for (const name of names) {
      const result = await query(
        `INSERT INTO regions (name, theft_score, loss_percent, transformer_risk, carbon_score, last_updated)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (name) DO UPDATE SET last_updated = NOW()
         RETURNING id`,
        [
          name,
          Math.round(rand(8, 35)),
          Number(rand(3, 12).toFixed(2)),
          Number(rand(20, 65).toFixed(2)),
          Math.round(rand(55, 85))
        ]
      );

      const regionId = result.rows[0].id;

      const existingTransformers = await query(
        "SELECT id FROM transformers WHERE region_id = $1 ORDER BY id",
        [regionId]
      );

      let transformerIds = existingTransformers.rows.map((r) => r.id);
      if (!transformerIds.length) {
        insertedRegions += 1;
        for (let i = 0; i < 3; i += 1) {
          const theftScore = rand(10, 45);
          const transformerRisk = rand(20, 80);
          const t = await query(
            `INSERT INTO transformers (region_id, capacity, temperature, load_percent, health_index, risk_level)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              regionId,
              Math.round(rand(200, 450)),
              Number(rand(45, 78).toFixed(2)),
              Number(rand(30, 88).toFixed(2)),
              Number(rand(0.45, 0.95).toFixed(2)),
              regionRisk(theftScore, transformerRisk)
            ]
          );
          transformerIds.push(t.rows[0].id);
          insertedTransformers += 1;
        }
      }

      const existingMeters = await query(
        "SELECT COUNT(*)::int AS c FROM smart_meters WHERE region_id = $1",
        [regionId]
      );

      if (!Number(existingMeters.rows[0].c)) {
        for (let i = 0; i < 24; i += 1) {
          const transformerId = transformerIds[i % transformerIds.length];
          await query(
            `INSERT INTO smart_meters (region_id, transformer_id, location_lat, location_lng, status, installed_at)
             VALUES ($1, $2, $3, $4, 'active', NOW())`,
            [regionId, transformerId, Number(rand(8.0, 35.0).toFixed(6)), Number(rand(68.0, 97.0).toFixed(6))]
          );
          insertedMeters += 1;
        }
      }
    }

    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }

  const finalCount = await query("SELECT COUNT(*)::int AS c FROM regions");

  console.log(
    JSON.stringify(
      {
        statesInGeoJSON: names.length,
        totalRegions: finalCount.rows[0].c,
        insertedRegions,
        insertedTransformers,
        insertedMeters
      },
      null,
      2
    )
  );
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

