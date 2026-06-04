import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { query } from "../src/db/pool.js";

dotenv.config();

const states = ["Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu", "Delhi"];

const run = async () => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD must be set before running the seed script");
  }

  await query("BEGIN");
  try {
    for (const name of states) {
      await query(
        "INSERT INTO regions (name, theft_score, loss_percent, transformer_risk, carbon_score) VALUES ($1, 10, 6, 12, 75) ON CONFLICT (name) DO NOTHING",
        [name]
      );
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'super_admin') ON CONFLICT (email) DO NOTHING",
      ["Super Admin", "admin@gridguard.ai", passwordHash]
    );

    const regionRows = await query("SELECT id, name FROM regions");

    for (const region of regionRows.rows) {
      for (let i = 0; i < 6; i += 1) {
        const tRes = await query(
          "INSERT INTO transformers (region_id, capacity, temperature, load_percent, health_index, risk_level) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          [region.id, 250 + i * 25, 55 + i * 2, 50 + i * 5, 0.85, "green"]
        );
        const transformerId = tRes.rows[0].id;
        for (let m = 0; m < 12; m += 1) {
          await query(
            "INSERT INTO smart_meters (region_id, transformer_id, location_lat, location_lng, status) VALUES ($1, $2, $3, $4, 'active')",
            [region.id, transformerId, 19 + Math.random(), 72 + Math.random()]
          );
        }
      }
    }

    await query("COMMIT");
    console.log("Seed complete");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }

  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
