import { query } from "../db/pool.js";

export const listRegions = async (req, res) => {
  const regions = await query("SELECT * FROM regions ORDER BY name");
  res.json(regions.rows);
};

export const listRegionsPublic = async (req, res) => {
  const regions = await query("SELECT id, name FROM regions ORDER BY name");
  res.json(regions.rows);
};

export const getRegionDetail = async (req, res) => {
  const { regionId } = req.params;
  const regionRes = await query("SELECT * FROM regions WHERE id = $1", [regionId]);
  if (!regionRes.rows.length) return res.status(404).json({ message: "Region not found" });

  const transformers = await query(
    "SELECT * FROM transformers WHERE region_id = $1 ORDER BY health_index ASC LIMIT 10",
    [regionId]
  );

  const riskyMeters = await query(
    `SELECT sm.id, sm.status, ar.theft_probability, ar.classification
     FROM smart_meters sm
     JOIN anomaly_reports ar ON ar.meter_id = sm.id
     WHERE sm.region_id = $1
     ORDER BY ar.theft_probability DESC NULLS LAST
     LIMIT 10`,
    [regionId]
  );

  res.json({
    region: regionRes.rows[0],
    transformers: transformers.rows,
    riskyMeters: riskyMeters.rows
  });
};
