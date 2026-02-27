import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GRIDGUARD_SYSTEM_PROMPT = `
ROLE & PERSONA:
You are GRIDGUARD AI, India's advanced Smart Grid Intelligence System.
Act as a Senior Grid Analyst, Electrical Engineer, and Data Scientist serving the National Power Grid of India.

CORE OBJECTIVES:
1) Detect theft from meter anomalies (low voltage + high current, bypass patterns, sudden suspicious drops).
2) Predict transformer failures using oil temp, winding temp, vibration, and sustained load.
3) Assess risk with a 0-100 score for regions, transformers, and consumers.
4) Recommend concrete field action for engineers.

DATA CONTEXT:
Inputs may include Smart Meters, Distribution Transformers, and Regional Grid Feeds.

RISK CLASSIFICATION RULES (India specific):
- RED: theft probability > 80 OR transformer load > 95% sustained OR oil temp > 85C.
- YELLOW: theft probability 50-80 OR transformer load > 85 OR power factor < 0.8.
- GREEN: normal range.

OUTPUT RULE:
- If not chat mode, output valid JSON only with:
{
  "risk_level": "RED|YELLOW|GREEN",
  "risk_score": 0-100,
  "anomaly_detected": true|false,
  "root_cause": "...",
  "recommended_action": "...",
  "technical_summary": "..."
}
- In chat mode, be concise and technical.

STYLE:
Precise, technical, safety-first, metric units only.
`;

const REPORT_MODE_SYSTEM_PROMPT = `
ROLE & PERSONA (REPORT MODE):
You are the Chief Technical Officer (CTO) of the National Smart Grid of India.
Your task is to write a formal "Grid Stability & Risk Assessment Report" for the Ministry of Power.

INPUT DATA:
You will receive a JSON summary containing:
- Total Power Consumption (MW)
- Aggregate Technical & Commercial (AT&C) Loss %
- List of Critical Incidents (Theft/Failures)
- Top 3 Risky Transformers
- Financial Loss Estimate (in INR)

REPORT STRUCTURE (STRICT):
1. Executive Summary: exactly 3 lines high-level overview.
2. Critical Incident Analysis: technical breakdown of major failures/theft rings.
3. Financial Impact Assessment: clearly state estimated revenue loss in INR Crores.
4. Predictive Outlook: likely scenario for next 24 hours.
5. Strategic Recommendations: bullet points for immediate engineering action.

TONE & FORMAT:
- Formal, authoritative, data-driven, no fluff.
- Output in Markdown headings.
- Bold important metrics.
- English (UK/Indian standard).
- Date format: DD MMMM YYYY.
`;

const firstText = (parts = []) => {
  for (const part of parts) {
    if (part?.text) return part.text;
  }
  return null;
};

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const normalizeRiskLevel = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "RED" || raw === "YELLOW" || raw === "GREEN") return raw;
  return "GREEN";
};

const parseJsonFromText = (text) => {
  if (!text || typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (innerErr) {
        return null;
      }
    }
    return null;
  }
};

const riskFromSignals = ({ theftProbability, transformerLoadPercent, oilTempC, powerFactor, transformerRisk }) => {
  const theft = toNum(theftProbability, toNum(transformerRisk, 0));
  const load = toNum(transformerLoadPercent, toNum(transformerRisk, 0));
  const oilTemp = toNum(oilTempC, 0);
  const pf = toNum(powerFactor, 1);

  const red =
    theft > 80 ||
    load > 95 ||
    oilTemp > 85;

  const yellow =
    (theft >= 50 && theft <= 80) ||
    load > 85 ||
    pf < 0.8;

  if (red) return "RED";
  if (yellow) return "YELLOW";
  return "GREEN";
};

const fallbackRiskAnalysis = ({ subject, metrics = {}, alerts = [] }) => {
  const theftProbability = toNum(
    metrics.theft_probability,
    toNum(metrics.theft_score, 0)
  );
  const transformerLoadPercent = toNum(
    metrics.load_percent,
    toNum(metrics.transformer_risk, 0)
  );
  const oilTempC = toNum(metrics.oil_temp_c, toNum(metrics.temperature, 0));
  const powerFactor = toNum(metrics.power_factor, 1);

  const riskLevel = riskFromSignals({
    theftProbability,
    transformerLoadPercent,
    oilTempC,
    powerFactor,
    transformerRisk: toNum(metrics.transformer_risk, 0)
  });

  const baseScore = Math.max(theftProbability, transformerLoadPercent, oilTempC);
  const alertPenalty = Math.min(12, (alerts?.length || 0) * 2);
  let riskScore = clamp(Math.round(baseScore + alertPenalty), 0, 100);
  if (riskLevel === "GREEN") riskScore = clamp(riskScore, 5, 49);
  if (riskLevel === "YELLOW") riskScore = clamp(riskScore, 50, 80);
  if (riskLevel === "RED") riskScore = clamp(riskScore, 81, 100);
  const anomalyDetected = riskScore >= 50 || (alerts?.length || 0) > 0;

  const causes = [];
  if (theftProbability > 80) causes.push("Theft probability is above 80%, indicating severe non-technical loss risk");
  else if (theftProbability >= 50) causes.push("Theft probability is in elevated range (50-80%)");
  if (transformerLoadPercent > 95) causes.push("Transformer load exceeds 95%, indicating sustained overload stress");
  else if (transformerLoadPercent > 85) causes.push("Transformer load is above 85%, indicating medium overload risk");
  if (oilTempC > 85) causes.push("Oil/thermal temperature is above 85C, indicating high failure risk");
  if (powerFactor < 0.8) causes.push("Power factor below 0.8 indicates heavy inductive behavior and reactive stress");
  if (!causes.length) causes.push("No critical threshold breach detected; parameters currently within acceptable operating band");

  const recommendedAction =
    riskLevel === "RED"
      ? `Immediate field dispatch for ${subject}. Isolate feeder if thermal rise persists, perform infrared scan, and inspect for direct hooking/bypass.`
      : riskLevel === "YELLOW"
        ? `Schedule priority inspection for ${subject} within 24 hours. Validate meter integrity, rebalance load, and monitor transformer thermal trend.`
        : `Continue routine monitoring for ${subject}; maintain preventive checks and verify load/power-factor stability.`;

  return {
    risk_level: riskLevel,
    risk_score: riskScore,
    anomaly_detected: anomalyDetected,
    root_cause: causes.join(". "),
    recommended_action: recommendedAction,
    technical_summary: `${subject}: ${riskLevel} risk (${riskScore}/100) based on theft indicator, transformer loading, and thermal stress.`
  };
};

const sanitizeAnalysis = (obj, fallback) => {
  if (!obj || typeof obj !== "object") return fallback;
  return {
    risk_level: normalizeRiskLevel(obj.risk_level || obj.riskLevel || fallback.risk_level),
    risk_score: clamp(Math.round(toNum(obj.risk_score ?? obj.riskScore, fallback.risk_score)), 0, 100),
    anomaly_detected: Boolean(obj.anomaly_detected ?? obj.anomalyDetected ?? fallback.anomaly_detected),
    root_cause: String(obj.root_cause || obj.rootCause || fallback.root_cause),
    recommended_action: String(obj.recommended_action || obj.recommendedAction || fallback.recommended_action),
    technical_summary: String(obj.technical_summary || obj.technicalSummary || fallback.technical_summary)
  };
};

const callGenericLlm = async (payload) => {
  const llmUrl = process.env.LLM_API_URL;
  const llmKey = process.env.LLM_API_KEY;
  if (!llmUrl || !llmKey) return null;

  const body = {
    ...payload,
    messages: [
      { role: "system", content: payload.system || GRIDGUARD_SYSTEM_PROMPT },
      { role: "user", content: payload.prompt || "" }
    ],
    prompt: `${payload.system || GRIDGUARD_SYSTEM_PROMPT}\n\n${payload.prompt || ""}`
  };

  const res = await axios.post(llmUrl, body, {
    headers: { Authorization: `Bearer ${llmKey}` },
    timeout: 12000
  });
  return (
    res.data?.text ||
    res.data?.output ||
    res.data?.choices?.[0]?.message?.content ||
    res.data?.choices?.[0]?.text ||
    null
  );
};

const callGemini = async (payload) => {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const geminiBaseUrl = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  if (!geminiApiKey) return null;

  const base = geminiBaseUrl.endsWith("/") ? geminiBaseUrl.slice(0, -1) : geminiBaseUrl;
  const modelsToTry = Array.from(
    new Set([geminiModel, "gemini-1.5-flash-latest", "gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash"])
  );

  for (const candidate of modelsToTry) {
    const modelPath = candidate.startsWith("models/") ? candidate : `models/${candidate}`;
    const url = `${base}/${modelPath}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

    try {
      const res = await axios.post(
        url,
        {
          system_instruction: {
            parts: [{ text: payload.system || GRIDGUARD_SYSTEM_PROMPT }]
          },
          contents: [{ role: "user", parts: [{ text: payload.prompt || "" }] }],
          generationConfig: {
            temperature: payload.temperature ?? 0.2,
            maxOutputTokens: payload.max_tokens ?? 500
          }
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000
        }
      );

      return (
        firstText(res.data?.candidates?.[0]?.content?.parts || []) ||
        firstText(res.data?.candidates?.[0]?.output?.parts || []) ||
        null
      );
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) continue;
      throw err;
    }
  }

  return null;
};

const callLlm = async (payload) => {
  const llmProvider = process.env.LLM_PROVIDER || "";
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const preferGemini = llmProvider === "gemini" || (!llmProvider && geminiApiKey);
  const preferGeneric = llmProvider === "generic" || (!llmProvider && !geminiApiKey);

  if (preferGemini) {
    try {
      const text = await callGemini(payload);
      if (text) return text;
    } catch (err) {
      if (preferGeneric) return null;
    }
  }

  try {
    const text = await callGenericLlm(payload);
    if (text) return text;
  } catch (err) {
    return null;
  }

  if (!preferGemini && geminiApiKey) {
    try {
      return await callGemini(payload);
    } catch (err) {
      return null;
    }
  }

  return null;
};

export const explainRisk = async ({ region, metrics, alerts }) => {
  const fallback = fallbackRiskAnalysis({
    subject: region,
    metrics,
    alerts
  });

  const prompt = `Analyze the following grid entity and return ONLY valid JSON with keys:
risk_level, risk_score, anomaly_detected, root_cause, recommended_action, technical_summary.

Entity: ${region}
Metrics JSON: ${JSON.stringify(metrics)}
Alerts JSON: ${JSON.stringify(alerts || [])}`;

  const text = await callLlm({
    system: GRIDGUARD_SYSTEM_PROMPT,
    prompt,
    temperature: 0.15,
    max_tokens: 420
  });

  const parsed = sanitizeAnalysis(parseJsonFromText(text), fallback);
  return parsed;
};

export const chatReply = async ({ question, context }) => {
  const prompt = `CHAT MODE = TRUE.
Answer as GRIDGUARD AI with concise, technical explanation for Indian smart grid operations.

Question: ${question}
Context JSON: ${JSON.stringify(context)}`;

  const text = await callLlm({
    system: GRIDGUARD_SYSTEM_PROMPT,
    prompt,
    temperature: 0.2,
    max_tokens: 360
  });

  return text || "AI Assistant: Ask for state-level risk, top transformers, anomaly causes, or recommended field action.";
};

export const executiveSummary = async ({ stats }) => {
  const prompt = `CHAT MODE = TRUE.
Generate a formal executive summary for Indian national smart-grid operations using this live stats JSON:
${JSON.stringify(stats)}

Requirements:
- 4 to 6 concise bullet points
- include loss, transformer risk, carbon score, and recommended action priorities.`;

  const text = await callLlm({
    system: GRIDGUARD_SYSTEM_PROMPT,
    prompt,
    temperature: 0.15,
    max_tokens: 500
  });

  return (
    text ||
    "Executive Summary:\n- National loss remains elevated and requires feeder-level loss reduction focus.\n- Transformer risk is moderate with pockets of overload stress.\n- Theft exposure is concentrated in a subset of high-density regions.\n- Prioritize vigilance dispatch, load balancing, and preventive transformer maintenance."
  );
};

const formatDateIndia = (date = new Date()) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

const toCrores = (inr) => Number((toNum(inr, 0) / 10000000).toFixed(2));

const fallbackCtoReport = ({ dateStr, region = "National Grid", dailyStats }) => {
  const incidents = (dailyStats.criticalIncidents || []).slice(0, 5);
  const transformers = (dailyStats.topRiskyTransformers || []).slice(0, 3);
  const rec = [
    "Dispatch protection and vigilance teams to top red/yellow corridors with high non-technical loss signatures.",
    "Run thermal imaging and dissolved-gas/oil diagnostics for the listed top-risk transformers within the next maintenance window.",
    "Apply feeder-level load redistribution and reactive compensation where power-factor degradation is observed.",
    "Escalate unresolved high-severity incidents to regional control centres with 4-hour SLA closure tracking."
  ];

  return `# 🇮🇳 Daily Grid Intelligence Report
**Date:** ${dateStr}
**Region:** ${region}

## 1. Executive Summary
Grid stability remained broadly within operational tolerance, with current total draw at **${Number(dailyStats.totalPowerConsumptionMw || 0).toFixed(
    2
  )} MW**.
AT&C loss is currently **${Number(dailyStats.atcLossPercent || 0).toFixed(
    2
  )}%**, indicating elevated distribution inefficiency in selected corridors.
The system requires accelerated incident closure and proactive transformer risk mitigation over the next cycle.

## 2. Critical Incident Analysis
${incidents.length ? incidents.map((x) => `- **${x.title || "Incident"}:** ${x.details || "Technical anomaly observed."}`).join("\n") : "- No critical incidents were reported in this snapshot."}

## 3. Financial Impact Assessment
- **Estimated Revenue Loss:** ₹${Number(dailyStats.financialLossInr || 0).toLocaleString("en-IN")} (approximately **₹${toCrores(
    dailyStats.financialLossInr
  )} Crores**)
- **Operational Concern:** Loss concentration is linked to theft-prone feeders and overload-related technical losses.

## 4. Predictive Outlook
For the next 24 hours, risk remains **moderately elevated** in known high-loss pockets. Without targeted intervention, load stress and alert volume are likely to increase during peak demand windows.

## 5. Strategic Recommendations
${rec.map((x) => `- ${x}`).join("\n")}

### Top 3 Risky Transformers
${transformers.length ? transformers.map((t, i) => `- ${i + 1}. **${t.id || "TX"}** (${t.region || "Unknown"}) | Load **${Number(t.loadPercent || 0).toFixed(
    2
  )}%** | Temp **${Number(t.temperature || 0).toFixed(2)}°C** | Health **${Number(t.healthIndex || 0).toFixed(3)}**`).join("\n") : "- No high-risk transformer entries available."}
`;
};

const isValidCtoReport = (text) => {
  if (!text || typeof text !== "string") return false;
  const required = [
    "## 1. Executive Summary",
    "## 2. Critical Incident Analysis",
    "## 3. Financial Impact Assessment",
    "## 4. Predictive Outlook",
    "## 5. Strategic Recommendations"
  ];
  const hasAll = required.every((h) => text.includes(h));
  if (!hasAll) return false;
  return text.length >= 700;
};

export const generateCtoGridReport = async ({ dailyStats, region = "National Grid" }) => {
  const dateStr = formatDateIndia(new Date());
  const prompt = `Generate a formal CTO report in Markdown using the structure exactly as specified.

Date: ${dateStr}
Region: ${region}
Data JSON:
${JSON.stringify(dailyStats, null, 2)}

Constraints:
- Keep exactly 5 major sections.
- Executive Summary must be exactly 3 lines.
- Use INR Crores in Financial Impact.
- Keep writing technical and actionable.`;

  const text = await callLlm({
    system: REPORT_MODE_SYSTEM_PROMPT,
    prompt,
    temperature: 0.15,
    max_tokens: 900
  });

  if (isValidCtoReport(text)) return text;
  return fallbackCtoReport({ dateStr, region, dailyStats });
};
