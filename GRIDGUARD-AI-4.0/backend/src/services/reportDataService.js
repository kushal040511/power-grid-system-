import { query } from "../db/pool.js";

const n = (value, fallback = 0) => Number(value ?? fallback);

const fmtNum = (value, digits = 2) => Number(n(value).toFixed(digits));

const fmtPct = (value, digits = 2) => `${fmtNum(value, digits)}%`;

const fmtInt = (value) => Math.round(n(value));

const formatDateTime = (iso) => {
  if (!iso) return "N/A";
  return new Date(iso).toISOString();
};

const buildRecommendations = (data) => {
  const rec = [];
  const avgLoss = n(data.metrics.avgLossPercent);
  const avgTheft = n(data.metrics.avgTheftScore);
  const openAlerts = n(data.metrics.openAlerts);
  const riskyTransformers = n(data.metrics.riskyTransformers);

  if (avgTheft >= 40) {
    rec.push(
      "Launch targeted theft-audit operations in high-risk states with feeder-wise inspection coverage and meter tamper forensics."
    );
  } else {
    rec.push("Maintain active anomaly surveillance and sustain monthly anti-theft audit cadence in medium-risk states.");
  }

  if (avgLoss >= 8) {
    rec.push(
      "Prioritize technical-loss reduction through transformer balancing, feeder reconfiguration, and high-loss pocket remediation."
    );
  } else {
    rec.push("Current national loss is within an acceptable band; continue preventive maintenance and loss monitoring.");
  }

  if (riskyTransformers >= 30) {
    rec.push("Initiate a 14-day transformer reliability sprint focused on high-load assets with low health index.");
  } else {
    rec.push("Continue proactive maintenance for critical transformers and monitor load excursions daily.");
  }

  if (openAlerts >= 20) {
    rec.push("Establish an alert triage war-room with SLA-based acknowledgement and closure tracking.");
  } else {
    rec.push("Maintain current alert response SLAs and weekly incident review meetings.");
  }

  rec.push(
    "Use LLM assistant for weekly executive briefings, including state-wise risk rationale and recommended field actions."
  );

  return rec;
};

export const collectLiveReportData = async () => {
  const [
    nationalRes,
    zoneRes,
    infraRes,
    alertRes,
    topRegionsRes,
    topTransformersRes,
    topMetersRes,
    trendRes,
    recentAlertsRes
  ] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total_regions,
         AVG(theft_score) AS avg_theft_score,
         AVG(loss_percent) AS avg_loss_percent,
         AVG(transformer_risk) AS avg_transformer_risk,
         AVG(carbon_score) AS avg_carbon_score
       FROM regions`
    ),
    query(
      `SELECT
         SUM(CASE WHEN theft_score < 40 THEN 1 ELSE 0 END)::int AS green_zones,
         SUM(CASE WHEN theft_score >= 40 AND theft_score <= 70 THEN 1 ELSE 0 END)::int AS yellow_zones,
         SUM(CASE WHEN theft_score > 70 THEN 1 ELSE 0 END)::int AS red_zones
       FROM regions`
    ),
    query(
      `SELECT
         (SELECT COUNT(*)::int FROM transformers) AS total_transformers,
         (SELECT COUNT(*)::int FROM smart_meters) AS total_meters,
         (SELECT COUNT(*)::int FROM transformers WHERE risk_level <> 'green' OR COALESCE(health_index, 1) < 0.7) AS risky_transformers`
    ),
    query(
      `SELECT
         COUNT(*)::int AS total_alerts,
         SUM(CASE WHEN acknowledged = false THEN 1 ELSE 0 END)::int AS open_alerts,
         SUM(CASE WHEN severity = 'high' AND created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END)::int AS high_alerts_24h
       FROM alerts`
    ),
    query(
      `SELECT name, theft_score, loss_percent, transformer_risk, carbon_score, last_updated
       FROM regions
       ORDER BY theft_score DESC, transformer_risk DESC
       LIMIT 10`
    ),
    query(
      `SELECT t.id, r.name AS region, t.load_percent, t.temperature, t.health_index, t.risk_level
       FROM transformers t
       LEFT JOIN regions r ON r.id = t.region_id
       ORDER BY COALESCE(t.health_index, 1) ASC, COALESCE(t.load_percent, 0) DESC
       LIMIT 10`
    ),
    query(
      `SELECT ar.meter_id, ar.theft_probability, ar.classification, ar.created_at, r.name AS region
       FROM anomaly_reports ar
       JOIN smart_meters sm ON sm.id = ar.meter_id
       LEFT JOIN regions r ON r.id = sm.region_id
       WHERE ar.created_at >= NOW() - INTERVAL '7 days'
       ORDER BY ar.theft_probability DESC NULLS LAST, ar.created_at DESC
       LIMIT 10`
    ),
    query(
      `SELECT DATE_TRUNC('hour', timestamp) AS hour, AVG(power) AS avg_power, COUNT(*)::int AS readings
       FROM readings
       WHERE timestamp >= NOW() - INTERVAL '24 hours'
       GROUP BY 1
       ORDER BY 1`
    ),
    query(
      `SELECT a.created_at, a.severity, a.message, r.name AS region
       FROM alerts a
       LEFT JOIN regions r ON r.id = a.region_id
       ORDER BY a.created_at DESC
       LIMIT 12`
    )
  ]);

  const national = nationalRes.rows[0] || {};
  const zones = zoneRes.rows[0] || {};
  const infra = infraRes.rows[0] || {};
  const alerts = alertRes.rows[0] || {};

  const avgPower24h = trendRes.rows.length
    ? trendRes.rows.reduce((acc, row) => acc + n(row.avg_power), 0) / trendRes.rows.length
    : 0;
  const totalMeters = n(infra.total_meters);
  const avgLossRatio = n(national.avg_loss_percent) / 100;
  const estimatedDailyEnergyLossKwh = avgPower24h * 24 * totalMeters * avgLossRatio;
  const estimatedDailyFinancialImpactInr = estimatedDailyEnergyLossKwh * 7;

  const metrics = {
    totalRegions: n(national.total_regions),
    avgTheftScore: fmtNum(national.avg_theft_score),
    avgLossPercent: fmtNum(national.avg_loss_percent),
    avgTransformerRisk: fmtNum(national.avg_transformer_risk),
    avgCarbonScore: fmtNum(national.avg_carbon_score),
    greenZones: n(zones.green_zones),
    yellowZones: n(zones.yellow_zones),
    redZones: n(zones.red_zones),
    totalTransformers: n(infra.total_transformers),
    totalMeters: n(infra.total_meters),
    riskyTransformers: n(infra.risky_transformers),
    totalAlerts: n(alerts.total_alerts),
    openAlerts: n(alerts.open_alerts),
    highAlerts24h: n(alerts.high_alerts_24h),
    estimatedDailyEnergyLossKwh: fmtNum(estimatedDailyEnergyLossKwh),
    estimatedDailyFinancialImpactInr: fmtNum(estimatedDailyFinancialImpactInr),
    avgPower24h: fmtNum(avgPower24h, 3)
  };

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    topRegions: topRegionsRes.rows.map((r, idx) => ({
      rank: idx + 1,
      name: r.name,
      theftScore: fmtNum(r.theft_score),
      lossPercent: fmtNum(r.loss_percent),
      transformerRisk: fmtNum(r.transformer_risk),
      carbonScore: fmtNum(r.carbon_score),
      lastUpdated: formatDateTime(r.last_updated)
    })),
    topTransformers: topTransformersRes.rows.map((t, idx) => ({
      rank: idx + 1,
      id: t.id,
      region: t.region || "Unknown",
      loadPercent: fmtNum(t.load_percent),
      temperature: fmtNum(t.temperature),
      healthIndex: fmtNum(t.health_index, 3),
      riskLevel: t.risk_level || "green"
    })),
    topMeters: topMetersRes.rows.map((m, idx) => ({
      rank: idx + 1,
      meterId: m.meter_id,
      region: m.region || "Unknown",
      theftProbability: fmtNum(m.theft_probability),
      classification: m.classification || "green",
      detectedAt: formatDateTime(m.created_at)
    })),
    trends24h: trendRes.rows.map((t) => ({
      hour: formatDateTime(t.hour),
      avgPower: fmtNum(t.avg_power, 3),
      readings: n(t.readings)
    })),
    recentAlerts: recentAlertsRes.rows.map((a) => ({
      time: formatDateTime(a.created_at),
      severity: a.severity,
      region: a.region || "Unknown",
      message: a.message
    }))
  };
};

export const buildFormalNarrative = ({ data, llmText = "", extraNote = "" }) => {
  const m = data.metrics;

  const baseSummary = [
    "This executive brief presents a formal live operational assessment of GRIDGUARD AI 4.0 based on current telemetry, anomaly outputs, and alert intelligence.",
    `At the time of generation, national average theft score stands at ${fmtPct(m.avgTheftScore)} and national distribution loss stands at ${fmtPct(
      m.avgLossPercent
    )}. The transformer risk index is ${fmtPct(m.avgTransformerRisk)} and the carbon optimization score is ${fmtPct(m.avgCarbonScore)}.`,
    `System footprint currently includes ${fmtInt(m.totalRegions)} regions, ${fmtInt(
      m.totalTransformers
    )} transformers, and ${fmtInt(m.totalMeters)} smart meters.`,
    `Risk zoning currently indicates ${fmtInt(m.redZones)} red zones, ${fmtInt(m.yellowZones)} yellow zones, and ${fmtInt(
      m.greenZones
    )} green zones.`,
    `The estimated daily financial impact of loss is INR ${m.estimatedDailyFinancialImpactInr.toLocaleString("en-IN")} based on recent load behavior and live loss conditions.`
  ];

  const llmBlock = llmText ? [llmText] : [];
  const noteBlock = extraNote ? [`Board Note: ${extraNote}`] : [];

  return [...baseSummary, ...llmBlock, ...noteBlock].join("\n\n");
};

export const buildReportSections = (data) => {
  const m = data.metrics;
  return [
    {
      title: "National Operational Snapshot",
      lines: [
        `Total Regions Monitored: ${fmtInt(m.totalRegions)}`,
        `Total Transformers Monitored: ${fmtInt(m.totalTransformers)}`,
        `Total Smart Meters Monitored: ${fmtInt(m.totalMeters)}`,
        `National Theft Score (Avg): ${fmtPct(m.avgTheftScore)}`,
        `National Distribution Loss (Avg): ${fmtPct(m.avgLossPercent)}`,
        `National Transformer Risk (Avg): ${fmtPct(m.avgTransformerRisk)}`,
        `National Carbon Optimization Score (Avg): ${fmtPct(m.avgCarbonScore)}`
      ]
    },
    {
      title: "Risk Zone Distribution",
      lines: [
        `Red Zones (>70 theft score): ${fmtInt(m.redZones)}`,
        `Yellow Zones (40-70 theft score): ${fmtInt(m.yellowZones)}`,
        `Green Zones (<40 theft score): ${fmtInt(m.greenZones)}`
      ]
    },
    {
      title: "Alert Intelligence",
      lines: [
        `Total Alerts Logged: ${fmtInt(m.totalAlerts)}`,
        `Open Alerts (Unacknowledged): ${fmtInt(m.openAlerts)}`,
        `High Severity Alerts in Last 24h: ${fmtInt(m.highAlerts24h)}`
      ],
      items: data.recentAlerts.map(
        (a) => `[${a.time}] (${a.severity.toUpperCase()}) ${a.region}: ${a.message}`
      )
    },
    {
      title: "Top High-Risk Regions",
      items: data.topRegions.map(
        (r) =>
          `${r.rank}. ${r.name} | Theft ${fmtPct(r.theftScore)} | Loss ${fmtPct(r.lossPercent)} | Transformer Risk ${fmtPct(
            r.transformerRisk
          )} | Carbon ${fmtPct(r.carbonScore)} | Updated ${r.lastUpdated}`
      )
    },
    {
      title: "Top Vulnerable Transformers",
      items: data.topTransformers.map(
        (t) =>
          `${t.rank}. ${t.region} | Transformer ${String(t.id).slice(0, 8)} | Load ${fmtPct(t.loadPercent)} | Temp ${t.temperature} C | Health ${t.healthIndex} | Risk ${String(
            t.riskLevel
          ).toUpperCase()}`
      )
    },
    {
      title: "Top Meter Anomalies (7-day window)",
      items: data.topMeters.map(
        (mtr) =>
          `${mtr.rank}. ${mtr.region} | Meter ${String(mtr.meterId).slice(0, 12)} | Theft Probability ${fmtPct(
            mtr.theftProbability
          )} | Class ${String(mtr.classification).toUpperCase()} | Detected ${mtr.detectedAt}`
      )
    },
    {
      title: "24-Hour Load Trend",
      lines: [`Average Power (24h): ${m.avgPower24h} kW`, `Estimated Daily Energy Loss: ${m.estimatedDailyEnergyLossKwh} kWh`],
      items: data.trends24h.slice(-12).map((t) => `${t.hour} | Avg Power ${t.avgPower} kW | Readings ${t.readings}`)
    },
    {
      title: "Recommended Actions",
      items: buildRecommendations(data)
    },
    {
      title: "Methodology Note",
      lines: [
        "This report is generated from live PostgreSQL operational data and near-real-time simulator/ingest streams.",
        "Risk zone classification follows GRIDGUARD thresholds based on theft probability and transformer stress signals.",
        "Financial impact estimation uses current average power, meter coverage, and loss percentage with an indicative INR conversion factor."
      ]
    }
  ];
};

