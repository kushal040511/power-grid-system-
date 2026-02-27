import { query } from "../db/pool.js";

export const listTransformers = async (req, res) => {
  const { regionId, limit } = req.query;
  const values = [];
  const where = regionId ? (values.push(regionId), `WHERE region_id = $${values.length}`) : "";
  const lim = limit ? `LIMIT ${Number(limit)}` : "";
  const result = await query(`SELECT * FROM transformers ${where} ORDER BY health_index ASC ${lim}`, values);
  res.json(result.rows);
};
