import {
  callElectricityMaps,
  listCatalog,
  syncElectricityMapsToRegions
} from "../services/electricityMapsService.js";

const parseQueryValue = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  return value;
};

export const getApiCatalog = async (req, res) => {
  res.json({ apis: listCatalog() });
};

export const proxyApi = async (req, res, next) => {
  try {
    const { path } = req.query;
    if (!path) return res.status(400).json({ message: "query param 'path' is required" });

    const params = { ...req.query };
    delete params.path;

    const normalizedParams = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, parseQueryValue(v)])
    );

    const data = await callElectricityMaps({
      path,
      method: "GET",
      params: normalizedParams
    });

    res.json({ path, data });
  } catch (err) {
    next(err);
  }
};

export const syncNow = async (req, res, next) => {
  try {
    if (!process.env.ELECTRICITYMAPS_API_KEY) {
      return res.status(400).json({
        message: "ELECTRICITYMAPS_API_KEY is missing. Configure it in backend/.env and restart backend."
      });
    }
    const rows = await syncElectricityMapsToRegions({ io: req.app.get("io") });
    res.json({ updated: rows.length, regions: rows });
  } catch (err) {
    next(err);
  }
};

export const getAllLatestSignals = async (req, res, next) => {
  try {
    const zone = req.query.zone || process.env.ELECTRICITYMAPS_DEFAULT_ZONE || "IN";
    const paths = [
      "/v3/carbon-intensity/latest",
      "/v3/carbon-intensity-fossil-only/latest",
      "/v3/carbon-intensity-level/latest",
      "/v3/carbon-free-energy/latest",
      "/v3/renewable-energy/latest",
      "/v3/power-breakdown/latest",
      "/v3/total-load/latest"
    ];

    const settled = await Promise.allSettled(
      paths.map((path) => callElectricityMaps({ path, method: "GET", params: { zone } }))
    );

    const payload = {};
    paths.forEach((path, idx) => {
      const result = settled[idx];
      if (result.status === "fulfilled") payload[path] = result.value;
      else payload[path] = { error: result.reason?.message || "failed" };
    });

    res.json({ zone, data: payload });
  } catch (err) {
    next(err);
  }
};
