import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const stateDefs = [
  { name: "Maharashtra", code: "MH", geojsonId: "MH" },
  { name: "Gujarat", code: "GJ", geojsonId: "GJ" },
  { name: "Karnataka", code: "KA", geojsonId: "KA" },
  { name: "Tamil Nadu", code: "TN", geojsonId: "TN" },
  { name: "Delhi", code: "DL", geojsonId: "DL" }
];

const now = () => new Date();

export const mockStore = {
  users: [],
  regions: [],
  transformers: [],
  meters: [],
  readings: [],
  alerts: [],
  anomalyReports: [],
  financialImpacts: [],
  carbonMetrics: []
};

let seeded = false;

export const isMockMode = () => process.env.MOCK_MODE === "true" || process.env.MOCK_MODE === "1";

const riskFromProb = (p) => {
  if (p >= 70) return "RED";
  if (p >= 40) return "YELLOW";
  return "GREEN";
};

export const ensureMockSeed = async () => {
  if (!isMockMode() || seeded) return;
  seeded = true;

  const adminHash = await bcrypt.hash("admin123", 10);

  mockStore.users.push({
    _id: randomUUID(),
    name: "Super Admin",
    email: "admin@gridguard.ai",
    passwordHash: adminHash,
    role: "SUPER_ADMIN",
    isActive: true,
    createdAt: now(),
    updatedAt: now()
  });

  stateDefs.forEach((state, idx) => {
    const regionId = randomUUID();
    mockStore.regions.push({
      _id: regionId,
      name: state.name,
      type: "STATE",
      code: state.code,
      geojsonId: state.geojsonId,
      createdAt: now(),
      updatedAt: now()
    });

    for (let t = 0; t < 8; t += 1) {
      const transformerId = randomUUID();
      mockStore.transformers.push({
        _id: transformerId,
        transformerId: `TR-${state.code}-${t + 1}`,
        region: regionId,
        capacityKva: 250 + t * 20,
        healthIndex: 0.82,
        overloadRisk: 0.22,
        overheatingRisk: 0.18,
        status: "OK",
        latitude: 19 + idx,
        longitude: 72 + t,
        createdAt: now(),
        updatedAt: now()
      });

      for (let m = 0; m < 10; m += 1) {
        mockStore.meters.push({
          _id: randomUUID(),
          meterId: `MT-${state.code}-${t + 1}-${m + 1}`,
          transformer: transformerId,
          region: regionId,
          latitude: 19 + idx,
          longitude: 72 + t + m * 0.02,
          customerType: "RESIDENTIAL",
          isActive: true,
          createdAt: now(),
          updatedAt: now()
        });
      }
    }
  });

  mockStore.financialImpacts.push({
    _id: randomUUID(),
    period: "2026-W06",
    lossAmountInr: 54000000,
    recoveredAmountInr: 11800000,
    theftCases: 62,
    createdAt: now(),
    updatedAt: now()
  });

  mockStore.carbonMetrics.push({
    _id: randomUUID(),
    period: "2026-W06",
    carbonSavedTons: 2200,
    carbonLossTons: 410,
    optimizationScore: 74,
    createdAt: now(),
    updatedAt: now()
  });

  for (let i = 0; i < 120; i += 1) {
    const region = mockStore.regions[i % mockStore.regions.length];
    const theftScore = Math.max(0, Math.min(1, 0.25 + Math.sin(i / 11) * 0.2 + Math.random() * 0.15));
    const reading = {
      _id: randomUUID(),
      region: region._id,
      ts: new Date(Date.now() - (120 - i) * 60000),
      voltage: 230 + (Math.random() * 14 - 7),
      current: 10 + (Math.random() * 3 - 1.5),
      powerKw: 2.3 + (Math.random() * 1.2 - 0.6),
      energyKwh: 1.2 + Math.random(),
      lossPct: Math.round((4 + theftScore * 14 + Math.random() * 2) * 10) / 10,
      theftScore,
      anomalyScore: theftScore,
      riskCategory: riskFromProb(Math.round(theftScore * 100)),
      createdAt: now(),
      updatedAt: now()
    };

    mockStore.readings.push(reading);

    if (reading.riskCategory !== "GREEN" && i % 7 === 0) {
      mockStore.alerts.push({
        _id: randomUUID(),
        severity: reading.riskCategory === "RED" ? "HIGH" : "MEDIUM",
        type: "THEFT",
        message: `Seeded anomaly in ${region.name}: loss ${reading.lossPct}%`,
        region: region._id,
        status: "OPEN",
        createdAt: now(),
        updatedAt: now()
      });
    }
  }
};

export const addMockReading = (reading) => {
  const doc = {
    _id: randomUUID(),
    ...reading,
    ts: reading.ts ? new Date(reading.ts) : now(),
    createdAt: now(),
    updatedAt: now()
  };
  mockStore.readings.push(doc);
  return doc;
};

export const addMockAlert = (alert) => {
  const doc = {
    _id: randomUUID(),
    status: "OPEN",
    ...alert,
    createdAt: now(),
    updatedAt: now()
  };
  mockStore.alerts.push(doc);
  return doc;
};

export const addMockAnomalyReport = (report) => {
  const doc = {
    _id: randomUUID(),
    ...report,
    createdAt: now(),
    updatedAt: now()
  };
  mockStore.anomalyReports.push(doc);
  return doc;
};

export const updateMockTransformer = ({ transformerId, healthIndex, overloadRisk, overheatingRisk }) => {
  const transformer = mockStore.transformers.find((t) => t.transformerId === transformerId);
  if (!transformer) return null;

  if (healthIndex !== undefined) transformer.healthIndex = healthIndex;
  if (overloadRisk !== undefined) transformer.overloadRisk = overloadRisk;
  if (overheatingRisk !== undefined) transformer.overheatingRisk = overheatingRisk;

  transformer.status = transformer.healthIndex < 0.4 ? "CRITICAL" : transformer.healthIndex < 0.7 ? "WARNING" : "OK";
  transformer.updatedAt = now();
  return transformer;
};
