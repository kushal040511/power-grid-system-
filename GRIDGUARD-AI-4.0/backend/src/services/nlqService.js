import Transformer from "../models/Transformer.js";
import Reading from "../models/Reading.js";
import { ensureMockSeed, isMockMode, mockStore } from "../data/mockStore.js";

export const handleNlQuery = async (question) => {
  await ensureMockSeed();
  const q = question.toLowerCase();

  if (q.includes("top") && q.includes("risky") && q.includes("transformer")) {
    const transformers = isMockMode()
      ? [...mockStore.transformers].sort((a, b) => a.healthIndex - b.healthIndex).slice(0, 5)
      : await Transformer.find().sort({ healthIndex: 1 }).limit(5);
    return { type: "transformers", data: transformers };
  }

  if (q.includes("next week") && q.includes("grid loss")) {
    const recent = isMockMode()
      ? [...mockStore.readings].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 200)
      : await Reading.find().sort({ ts: -1 }).limit(200);
    const avgLoss = recent.length ? recent.reduce((a, r) => a + (r.lossPct || 0), 0) / recent.length : 6;
    return { type: "forecast", data: { projectedLossPct: Math.round(avgLoss + 1.5) } };
  }

  if (q.includes("why") && q.includes("red")) {
    return { type: "explanation", data: "High loss%, theft anomalies, and transformer strain pushed the risk band to RED." };
  }

  return { type: "unknown", data: "Query not recognized. Try: 'Top 5 risky transformers' or 'Predict next week grid loss'." };
};
