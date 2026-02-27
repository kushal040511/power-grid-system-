import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pool from "../src/db/pool.js";

dotenv.config();

const migrationsDir = path.resolve("./migrations");

const ensureTable = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`);
};

const applied = async () => {
  const res = await pool.query("SELECT filename FROM schema_migrations");
  return new Set(res.rows.map((r) => r.filename));
};

const run = async () => {
  await ensureTable();
  const done = await applied();
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}`);
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }

  console.log("Migrations complete");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
