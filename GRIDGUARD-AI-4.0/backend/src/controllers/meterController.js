import { query } from "../db/pool.js";

export const listMeters = async (req, res) => {
  const { regionId, transformerId, limit } = req.query;
  const filters = [];
  const values = [];

  if (regionId) {
    values.push(regionId);
    filters.push(`region_id = $${values.length}`);
  }
  if (transformerId) {
    values.push(transformerId);
    filters.push(`transformer_id = $${values.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const lim = limit ? `LIMIT ${Number(limit)}` : "";
  const result = await query(`SELECT * FROM smart_meters ${where} ${lim}`, values);
  res.json(result.rows);
};
