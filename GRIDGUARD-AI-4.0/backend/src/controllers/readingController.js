import { query } from "../db/pool.js";

export const latestReadings = async (req, res) => {
  const readings = await query(
    `SELECT r.*, sm.region_id, ar.theft_probability
     FROM readings r
     JOIN smart_meters sm ON sm.id = r.meter_id
     LEFT JOIN LATERAL (
       SELECT theft_probability FROM anomaly_reports ar
       WHERE ar.meter_id = r.meter_id
       ORDER BY ar.created_at DESC
       LIMIT 1
     ) ar ON true
     ORDER BY r.timestamp DESC
     LIMIT 200`
  );
  res.json(readings.rows);
};

export const regionTrend = async (req, res) => {
  const { regionId } = req.params;
  const readings = await query(
    `SELECT r.*, ar.theft_probability
     FROM readings r
     JOIN smart_meters sm ON sm.id = r.meter_id
     LEFT JOIN LATERAL (
       SELECT theft_probability FROM anomaly_reports ar
       WHERE ar.meter_id = r.meter_id
       ORDER BY ar.created_at DESC
       LIMIT 1
     ) ar ON true
     WHERE sm.region_id = $1
     ORDER BY r.timestamp DESC
     LIMIT 200`,
    [regionId]
  );
  res.json(readings.rows);
};
