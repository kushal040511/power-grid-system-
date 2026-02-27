import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import MapPanel from "../components/MapPanel";
import TrendChart from "../components/TrendChart";
import api from "../services/api";
import socket from "../services/socket";

const riskClass = (theftScore, transformerRisk) => {
  if (theftScore > 70 || transformerRisk > 80) return "red";
  if (theftScore >= 40 || transformerRisk >= 60) return "yellow";
  return "green";
};

const normalize = (v) => String(v || "").trim().toLowerCase();

export default function RiskMap() {
  const [riskByRegion, setRiskByRegion] = useState({});
  const [selected, setSelected] = useState(null);
  const [trend, setTrend] = useState([]);
  const [regionDetail, setRegionDetail] = useState({ transformers: [], riskyMeters: [] });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [explanation, setExplanation] = useState("Select a region to view AI insight.");
  const [error, setError] = useState("");

  const fetchRisk = async () => {
    try {
      const res = await api.get("/dashboard/risk-map");
      const mapped = {};
      (res.data.regions || []).forEach((r) => {
        const theftScore = Number(r.theft_score || 0);
        const lossPercent = Number(r.loss_percent || 0);
        const transformerRisk = Number(r.transformer_risk || 0);
        const carbonScore = Number(r.carbon_score || 0);
        const regionData = {
          ...r,
          theft_score: theftScore,
          loss_percent: lossPercent,
          transformer_risk: transformerRisk,
          carbon_score: carbonScore,
          risk: riskClass(theftScore, transformerRisk)
        };
        mapped[normalize(r.name)] = regionData;
      });
      setRiskByRegion(mapped);
      setError("");

      if (!selected) {
        const first = Object.values(mapped)[0];
        if (first) {
          setSelected({
            feature: { properties: { name: first.name } },
            data: first
          });
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load live map data.");
    }
  };

  useEffect(() => {
    fetchRisk();
    const quickPoll = setInterval(fetchRisk, 15000);
    const hourlySync = setInterval(fetchRisk, 60 * 60 * 1000);

    const onRegionUpdate = (payload) => {
      if (!payload?.name) return;
      setRiskByRegion((prev) => ({
        ...prev,
        [normalize(payload.name)]: {
          ...payload,
          theft_score: Number(payload.theft_score || 0),
          loss_percent: Number(payload.loss_percent || 0),
          transformer_risk: Number(payload.transformer_risk || 0),
          carbon_score: Number(payload.carbon_score || 0),
          risk: riskClass(Number(payload.theft_score || 0), Number(payload.transformer_risk || 0))
        }
      }));
    };

    socket.on("region:update", onRegionUpdate);
    socket.on("risk-map:update", onRegionUpdate);

    return () => {
      clearInterval(quickPoll);
      clearInterval(hourlySync);
      socket.off("region:update", onRegionUpdate);
      socket.off("risk-map:update", onRegionUpdate);
    };
  }, []);

  const handleRegionClick = async (feature, data) => {
    setError("");
    setSelected({ feature, data });
    if (!data?.region_id) {
      setTrend([]);
      setRegionDetail({ transformers: [], riskyMeters: [] });
      setExplanation(`No data mapped for "${feature?.properties?.name || "this region"}" yet.`);
      return;
    }

    setLoadingDetail(true);
    const [trendRes, explainRes, detailRes] = await Promise.allSettled([
      api.get(`/readings/trend/${data.region_id}`),
      api.post("/llm/explain", { regionId: data.region_id }),
      api.get(`/regions/${data.region_id}`)
    ]);

    if (trendRes.status === "fulfilled") {
      setTrend(trendRes.value.data || []);
    } else {
      setTrend([]);
    }

    if (explainRes.status === "fulfilled") {
      setExplanation(explainRes.value.data?.text || "AI explanation unavailable.");
    } else {
      setExplanation("AI explanation unavailable right now.");
    }

    if (detailRes.status === "fulfilled") {
      setRegionDetail({
        transformers: detailRes.value.data?.transformers || [],
        riskyMeters: detailRes.value.data?.riskyMeters || []
      });
    } else {
      setRegionDetail({ transformers: [], riskyMeters: [] });
      setError("Failed to load region drill-down details.");
    }

    setLoadingDetail(false);
  };

  useEffect(() => {
    if (!selected?.data?.region_id) return;
    const normalized = normalize(selected.data.name);
    const nextData = riskByRegion[normalized];
    if (!nextData) return;
    setSelected((prev) => ({ ...prev, data: nextData }));
  }, [riskByRegion, selected?.data?.region_id]);

  const selectedName = selected?.data?.name || selected?.feature?.properties?.name;
  const selectedRisk = selected?.data?.risk || "unknown";
  const selectedScore = Number(selected?.data?.theft_score || 0);

  const statusClass =
    selectedRisk === "red"
      ? "text-red-300"
      : selectedRisk === "yellow"
        ? "text-yellow-300"
        : "text-emerald-300";

  const topTransformers = (regionDetail.transformers || []).slice(0, 5);
  const topMeters = (regionDetail.riskyMeters || []).slice(0, 5);

  const meterText = (m) => `${m.id?.slice(0, 8) || "meter"} • ${Math.round(Number(m.theft_probability || 0))}%`;
  const transformerText = (t) => `Load ${Math.round(Number(t.load_percent || 0))}% • Health ${Number(t.health_index || 0).toFixed(2)}`;

  const mapDataAvailable = Object.keys(riskByRegion).length > 0;

  const autoSelectFirst = async () => {
    if (!mapDataAvailable || selected) return;
    const first = Object.values(riskByRegion)[0];
    if (!first) return;
    await handleRegionClick({ properties: { name: first.name } }, first);
  };

  useEffect(() => {
    autoSelectFirst();
  }, [mapDataAvailable]);

  return (
    <div className="space-y-8 fade-in">
      <Topbar title="India Risk Map" subtitle="Red / Yellow / Green risk zones" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MapPanel
            riskByRegion={riskByRegion}
            onRegionClick={handleRegionClick}
            selectedRegionName={selectedName}
          />
        </div>
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="text-sm text-white/70">AI Explanation</div>
            <div className="mt-2 text-sm text-white/80">{explanation}</div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-sm text-white/70">Drill-down</div>
            <div className="mt-2 text-sm text-white/90">
              {selectedName || "Select a state"} {selectedName ? `(${Math.round(selectedScore)}%)` : ""}
            </div>
            <div className={`text-xs ${statusClass}`}>Status: {selectedRisk.toUpperCase()}</div>
            {loadingDetail && <div className="mt-2 text-xs text-white/60">Loading region detail...</div>}
            {!loadingDetail && (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Top Risky Transformers</div>
                  <div className="space-y-1 text-xs text-white/80">
                    {topTransformers.length ? topTransformers.map((t) => <div key={t.id}>{transformerText(t)}</div>) : <div>No transformer detail yet.</div>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Top Risky Meters</div>
                  <div className="space-y-1 text-xs text-white/80">
                    {topMeters.length ? topMeters.map((m) => <div key={m.id}>{meterText(m)}</div>) : <div>No risky meters yet.</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
          {error && <div className="glass rounded-2xl p-4 text-sm text-amber-300">{error}</div>}
          <TrendChart trend={trend} />
        </div>
      </div>
    </div>
  );
}
