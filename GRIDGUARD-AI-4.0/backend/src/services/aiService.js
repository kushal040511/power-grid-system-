import axios from "axios";

const baseURL = process.env.AI_SERVICE_URL || "http://localhost:8001";

export const predictTheft = async (payload) => {
  try {
    const res = await axios.post(`${baseURL}/predict-theft`, payload, { timeout: 5000 });
    return res.data;
  } catch (err) {
    const theftProbability = Math.min(100, Math.max(0, Math.round((payload.loss_percent || 5) * 3)));
    return {
      anomaly_score: (payload.loss_percent || 5) / 10,
      theft_probability: theftProbability,
      risk_class: theftProbability > 70 ? "red" : theftProbability > 40 ? "yellow" : "green"
    };
  }
};

export const predictTransformer = async (payload) => {
  try {
    const res = await axios.post(`${baseURL}/predict-transformer`, payload, { timeout: 5000 });
    return res.data;
  } catch (err) {
    return {
      health_index: Math.max(0, 1 - (payload.load_percent || 40) / 120),
      overload_risk: Math.min(1, (payload.load_percent || 40) / 100)
    };
  }
};

export const generateRiskScore = async (payload) => {
  try {
    const res = await axios.post(`${baseURL}/generate-risk-score`, payload, { timeout: 5000 });
    return res.data;
  } catch (err) {
    return {
      theft_score: payload.theft_probability || 30,
      carbon_score: payload.carbon_score || 70,
      transformer_risk: payload.transformer_risk || 20
    };
  }
};
