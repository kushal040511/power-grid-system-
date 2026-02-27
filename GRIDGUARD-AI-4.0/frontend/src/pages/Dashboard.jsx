import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import AlertList from "../components/AlertList";
import TrendChart from "../components/TrendChart";
import api from "../services/api";
import socket from "../services/socket";

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dash = await api.get("/dashboard");
        setStats(dash.data);
        setAlerts(dash.data.liveAlerts || []);

        const readings = await api.get("/readings/latest");
        setTrend(readings.data || []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load dashboard data.");
      }
    };

    fetchData();
    const hourly = setInterval(fetchData, 60 * 60 * 1000);

    socket.on("reading", (reading) => {
      setTrend((prev) => [reading, ...prev].slice(0, 120));
    });
    socket.on("alert", () => {
      fetchData();
    });
    socket.on("region:update", () => {
      fetchData();
    });

    return () => {
      clearInterval(hourly);
      socket.off("reading");
      socket.off("alert");
      socket.off("region:update");
    };
  }, []);

  const handleDownloadReport = async () => {
    setReportLoading(true);
    try {
      const res = await api.post("/reports/generate");
      const reportText = res.data?.report || "";
      const filename = res.data?.filename || `Grid_Report_${new Date().toISOString()}.md`;

      const element = document.createElement("a");
      const file = new Blob([reportText], { type: "text/markdown" });
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      element.remove();
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <Topbar title="Executive Dashboard" subtitle="National smart grid intelligence overview" />
      {error && <div className="glass rounded-2xl p-4 text-sm text-amber-300">{error}</div>}

      <div className="glass rounded-2xl p-4 flex items-center justify-between">
        <div className="text-sm text-white/70">CTO Report Mode (Markdown)</div>
        <button
          onClick={handleDownloadReport}
          disabled={reportLoading}
          className="px-4 py-2 rounded-lg bg-teal text-ink font-semibold disabled:opacity-60"
        >
          {reportLoading ? "Generating..." : "Download Report"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="National Loss %" value={`${stats.lossPct || 0}%`} trend="Updated live" />
        <StatCard label="Active Theft Cases" value={stats.activeTheftCases || 0} trend="Anomaly-driven" />
        <StatCard label="Transformers At Risk" value={stats.transformersAtRisk || 0} trend="Health predictive" />
        <StatCard label="Carbon Optimization" value={`${stats.carbonOptimizationScore || 0}`} trend="Net-zero tracker" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TrendChart trend={trend} />
        </div>
        <AlertList alerts={alerts} />
      </div>
    </div>
  );
}
