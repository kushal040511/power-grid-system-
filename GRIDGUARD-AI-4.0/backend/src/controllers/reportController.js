import fs from "fs";
import { query } from "../db/pool.js";
import { generatePdfReport } from "../services/reportService.js";
import { executiveSummary } from "../services/llmService.js";
import { buildDailyStatsFromLive, generateExecutiveReportMarkdown } from "../services/reportGenerator.js";
import {
  collectLiveReportData,
  buildFormalNarrative,
  buildReportSections
} from "../services/reportDataService.js";

const buildReportPayload = async ({ extraNote = "" } = {}) => {
  const live = await collectLiveReportData();
  const llmText = await executiveSummary({ stats: live.metrics });
  const summary = buildFormalNarrative({ data: live, llmText, extraNote });
  const sections = buildReportSections(live);
  const keyMetrics = [
    { label: "National Theft Score (Avg)", value: `${live.metrics.avgTheftScore}%` },
    { label: "National Distribution Loss (Avg)", value: `${live.metrics.avgLossPercent}%` },
    { label: "Transformer Risk (Avg)", value: `${live.metrics.avgTransformerRisk}%` },
    { label: "Carbon Optimization (Avg)", value: `${live.metrics.avgCarbonScore}%` },
    { label: "Open Alerts", value: String(live.metrics.openAlerts) },
    { label: "High Alerts (24h)", value: String(live.metrics.highAlerts24h) },
    { label: "Estimated Daily Financial Impact (INR)", value: live.metrics.estimatedDailyFinancialImpactInr.toLocaleString("en-IN") }
  ];

  return {
    generatedAt: live.generatedAt,
    summary,
    sections,
    keyMetrics,
    live
  };
};

export const generateReport = async (req, res) => {
  const extraNote = req.body?.extraNote || req.body?.summary || "";
  const payload = await buildReportPayload({ extraNote });
  const filePath = await generatePdfReport(payload);

  const insert = await query(
    "INSERT INTO executive_reports (generated_by, summary_text, file_path) VALUES ($1, $2, $3) RETURNING id, file_path",
    [req.user?.id || null, payload.summary, filePath]
  );

  res.json({
    id: insert.rows[0].id,
    filePath: insert.rows[0].file_path,
    generatedAt: payload.generatedAt,
    keyMetrics: payload.keyMetrics,
    summary: payload.summary
  });
};

export const downloadReport = async (req, res) => {
  const { id } = req.params;
  const report = await query("SELECT file_path FROM executive_reports WHERE id = $1", [id]);
  if (!report.rows.length) return res.status(404).json({ message: "Report not found" });

  const filePath = report.rows[0].file_path;
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing" });
  res.download(filePath);
};

export const previewReport = async (req, res) => {
  const extraNote = req.query?.note || "";
  const payload = await buildReportPayload({ extraNote });
  res.json({
    generatedAt: payload.generatedAt,
    summary: payload.summary,
    keyMetrics: payload.keyMetrics,
    sections: payload.sections
  });
};

export const generateMarkdownReport = async (req, res) => {
  const live = await collectLiveReportData();
  const dailyStats = buildDailyStatsFromLive({ live });
  const region = req.body?.region || "National Grid";
  const report = await generateExecutiveReportMarkdown({ dailyStats, region });

  const filename = `Grid_Report_${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
  res.json({
    generatedAt: new Date().toISOString(),
    filename,
    dailyStats,
    report
  });
};
