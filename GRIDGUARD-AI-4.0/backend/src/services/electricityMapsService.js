import axios from "axios";
import { query } from "../db/pool.js";

const BASE_URL = process.env.ELECTRICITYMAPS_BASE_URL || "https://api.electricitymap.org";
const DEFAULT_ZONE = process.env.ELECTRICITYMAPS_DEFAULT_ZONE || "IN";

export const API_CATALOG = [
  { key: "zones", method: "GET", path: "/v3/zones", description: "List zones" },
  { key: "zone_lookup", method: "GET", path: "/v3/zone", description: "Find zone by lat/lon" },
  { key: "data_centers", method: "GET", path: "/v3/data-centers", description: "List data centers" },

  { key: "carbon_latest", method: "GET", path: "/v3/carbon-intensity/latest", description: "Latest carbon intensity" },
  { key: "carbon_history", method: "GET", path: "/v3/carbon-intensity/history", description: "Last 24h carbon intensity" },
  { key: "carbon_forecast", method: "GET", path: "/v3/carbon-intensity/forecast", description: "Carbon intensity forecast" },
  { key: "carbon_past", method: "GET", path: "/v3/carbon-intensity/past", description: "Past carbon intensity" },
  { key: "carbon_past_range", method: "GET", path: "/v3/carbon-intensity/past-range", description: "Past range carbon intensity" },

  { key: "carbon_fossil_latest", method: "GET", path: "/v3/carbon-intensity-fossil-only/latest", description: "Latest fossil-only carbon intensity" },
  { key: "carbon_fossil_history", method: "GET", path: "/v3/carbon-intensity-fossil-only/history", description: "History fossil-only carbon intensity" },
  { key: "carbon_fossil_forecast", method: "GET", path: "/v3/carbon-intensity-fossil-only/forecast", description: "Forecast fossil-only carbon intensity" },
  { key: "carbon_fossil_past", method: "GET", path: "/v3/carbon-intensity-fossil-only/past", description: "Past fossil-only carbon intensity" },
  { key: "carbon_fossil_past_range", method: "GET", path: "/v3/carbon-intensity-fossil-only/past-range", description: "Past range fossil-only carbon intensity" },

  { key: "carbon_level_latest", method: "GET", path: "/v3/carbon-intensity-level/latest", description: "Latest carbon intensity level" },

  { key: "carbon_free_latest", method: "GET", path: "/v3/carbon-free-energy/latest", description: "Latest carbon-free energy %" },
  { key: "carbon_free_history", method: "GET", path: "/v3/carbon-free-energy/history", description: "History carbon-free energy %" },
  { key: "carbon_free_forecast", method: "GET", path: "/v3/carbon-free-energy/forecast", description: "Forecast carbon-free energy %" },
  { key: "carbon_free_past", method: "GET", path: "/v3/carbon-free-energy/past", description: "Past carbon-free energy %" },
  { key: "carbon_free_past_range", method: "GET", path: "/v3/carbon-free-energy/past-range", description: "Past range carbon-free energy %" },

  { key: "renewable_latest", method: "GET", path: "/v3/renewable-energy/latest", description: "Latest renewable energy %" },
  { key: "renewable_history", method: "GET", path: "/v3/renewable-energy/history", description: "History renewable energy %" },
  { key: "renewable_forecast", method: "GET", path: "/v3/renewable-energy/forecast", description: "Forecast renewable energy %" },
  { key: "renewable_past", method: "GET", path: "/v3/renewable-energy/past", description: "Past renewable energy %" },
  { key: "renewable_past_range", method: "GET", path: "/v3/renewable-energy/past-range", description: "Past range renewable energy %" },

  { key: "power_breakdown_latest", method: "GET", path: "/v3/power-breakdown/latest", description: "Latest power breakdown" },
  { key: "power_breakdown_history", method: "GET", path: "/v3/power-breakdown/history", description: "History power breakdown" },
  { key: "power_breakdown_forecast", method: "GET", path: "/v3/power-breakdown/forecast", description: "Forecast power breakdown" },

  { key: "total_load_latest", method: "GET", path: "/v3/total-load/latest", description: "Latest total load" },
  { key: "total_load_history", method: "GET", path: "/v3/total-load/history", description: "History total load" },
  { key: "total_load_forecast", method: "GET", path: "/v3/total-load/forecast", description: "Forecast total load" },
  { key: "total_load_past", method: "GET", path: "/v3/total-load/past", description: "Past total load" },
  { key: "total_load_past_range", method: "GET", path: "/v3/total-load/past-range", description: "Past range total load" }
];

const parseZoneMap = () => {
  const raw = process.env.ELECTRICITYMAPS_REGION_ZONE_MAP;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const defaultHeaders = () => {
  const headers = {};
  if (process.env.ELECTRICITYMAPS_API_KEY) {
    headers["auth-token"] = process.env.ELECTRICITYMAPS_API_KEY;
  }
  return headers;
};

const normalizePath = (path) => {
  if (!path) return "/v3/carbon-intensity/latest";
  if (path.startsWith("/")) return path;
  return `/${path}`;
};

export const callElectricityMaps = async ({ path, method = "GET", params = {}, data = null }) => {
  const requestPath = normalizePath(path);
  let lastErr = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await axios({
        method,
        url: `${BASE_URL}${requestPath}`,
        params,
        data,
        headers: defaultHeaders(),
        timeout: 12000
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const retryable = !status || status >= 500 || status === 429;
      if (!retryable || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  const msg = lastErr?.response?.data?.error || lastErr?.message || "Electricity Maps request failed";
  const e = new Error(msg);
  e.status = lastErr?.response?.status || 502;
  throw e;
};

export const listCatalog = () => API_CATALOG;

const numeric = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
};

const zoneForRegion = (regionName) => {
  const map = parseZoneMap();
  return map[regionName] || DEFAULT_ZONE;
};

const createAlertIfNeeded = async ({ regionId, regionName, theftScore, intensity }) => {
  if (theftScore <= 70) return;

  const existing = await query(
    `SELECT id FROM alerts
     WHERE region_id = $1 AND message LIKE 'Electricity Maps%'
       AND created_at >= NOW() - INTERVAL '15 minutes'
     LIMIT 1`,
    [regionId]
  );

  if (existing.rows.length) return;

  await query(
    "INSERT INTO alerts (region_id, severity, message, acknowledged) VALUES ($1, 'high', $2, false)",
    [regionId, `Electricity Maps high carbon signal for ${regionName}: ${Math.round(intensity || 0)} gCO2eq/kWh`]
  );
};

export const syncElectricityMapsToRegions = async ({ io } = {}) => {
  const regionRows = await query("SELECT id, name FROM regions ORDER BY name");
  const out = [];

  for (const region of regionRows.rows) {
    const zone = zoneForRegion(region.name);

    let latest = null;
    let carbonFree = null;
    let fossil = null;
    let load = null;

    try {
      latest = await callElectricityMaps({ path: "/v3/carbon-intensity/latest", params: { zone } });
    } catch (err) {
      latest = null;
    }

    try {
      carbonFree = await callElectricityMaps({ path: "/v3/carbon-free-energy/latest", params: { zone } });
    } catch (err) {
      carbonFree = null;
    }

    try {
      fossil = await callElectricityMaps({ path: "/v3/carbon-intensity-fossil-only/latest", params: { zone } });
    } catch (err) {
      fossil = null;
    }

    try {
      load = await callElectricityMaps({ path: "/v3/total-load/latest", params: { zone } });
    } catch (err) {
      load = null;
    }

    // Keep existing region values if all external calls failed.
    if (!latest && !carbonFree && !fossil && !load) {
      const existing = await query(
        `SELECT id AS region_id, name, theft_score, loss_percent, transformer_risk, carbon_score, last_updated
         FROM regions WHERE id = $1`,
        [region.id]
      );
      if (existing.rows[0]) out.push({ ...existing.rows[0], zone, source: "unchanged" });
      continue;
    }

    const intensity = numeric(latest?.carbonIntensity, latest?.value, latest?.carbonIntensityAvg, fossil?.carbonIntensity);
    const cfe = numeric(carbonFree?.carbonFreeEnergy, carbonFree?.value, carbonFree?.renewablePercentage);
    const totalLoad = numeric(load?.totalLoad, load?.value, load?.consumption);

    const theftScore = intensity === null ? 0 : clamp(Math.round(intensity / 8), 0, 100);
    const carbonScore = cfe !== null ? clamp(Math.round(cfe), 0, 100) : intensity === null ? 60 : clamp(100 - Math.round(intensity / 10), 0, 100);
    const transformerRisk = intensity === null ? 0 : clamp(Math.round(intensity / 7), 0, 100);
    const lossPercent = totalLoad === null ? clamp(100 - carbonScore, 0, 100) : clamp(Math.round((totalLoad / 1000) % 100), 0, 100);

    await query(
      `UPDATE regions
       SET theft_score = $1,
           loss_percent = $2,
           transformer_risk = $3,
           carbon_score = $4,
           last_updated = NOW()
       WHERE id = $5`,
      [theftScore, lossPercent, transformerRisk, carbonScore, region.id]
    );

    await createAlertIfNeeded({
      regionId: region.id,
      regionName: region.name,
      theftScore,
      intensity
    });

    const row = {
      region_id: region.id,
      name: region.name,
      zone,
      theft_score: theftScore,
      loss_percent: lossPercent,
      transformer_risk: transformerRisk,
      carbon_score: carbonScore,
      last_updated: new Date().toISOString(),
      raw: {
        latest,
        carbonFree,
        fossil,
        load
      },
      source: "electricitymaps"
    };
    out.push(row);

    if (io) {
      io.emit("region:update", row);
      io.emit("risk-map:update", row);
    }
  }

  return out;
};
