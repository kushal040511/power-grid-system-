import { generateCtoGridReport } from "./llmService.js";

const toCrores = (inr) => Number((Number(inr || 0) / 10000000).toFixed(2));

export const buildDailyStatsFromLive = ({ live }) => {
  const m = live?.metrics || {};
  const topTransformers = (live?.topTransformers || []).slice(0, 3).map((t) => ({
    id: t.id,
    region: t.region,
    loadPercent: Number(t.loadPercent || 0),
    temperature: Number(t.temperature || 0),
    healthIndex: Number(t.healthIndex || 0),
    riskLevel: t.riskLevel
  }));

  const criticalIncidents = [
    ...(live?.recentAlerts || []).slice(0, 6).map((a) => ({
      title: `Alert ${a.severity?.toUpperCase() || "MEDIUM"} - ${a.region || "Unknown Region"}`,
      details: a.message
    })),
    ...(live?.topMeters || []).slice(0, 4).map((mtr) => ({
      title: `Meter Anomaly - ${mtr.region || "Unknown"}`,
      details: `Meter ${String(mtr.meterId || "").slice(0, 12)} flagged with theft probability ${Number(
        mtr.theftProbability || 0
      ).toFixed(2)}% (${String(mtr.classification || "green").toUpperCase()}).`
    }))
  ].slice(0, 8);

  const estimatedLossInr = Number(m.estimatedDailyFinancialImpactInr || 0);

  return {
    totalPowerConsumptionMw: Number((Number(m.avgPower24h || 0) * Number(m.totalMeters || 0) / 1000).toFixed(2)),
    atcLossPercent: Number(m.avgLossPercent || 0),
    criticalIncidents,
    topRiskyTransformers: topTransformers,
    financialLossInr: estimatedLossInr,
    financialLossInrCrores: toCrores(estimatedLossInr)
  };
};

export const generateExecutiveReportMarkdown = async ({ dailyStats, region }) => {
  const report = await generateCtoGridReport({ dailyStats, region: region || "National Grid" });
  return report;
};

