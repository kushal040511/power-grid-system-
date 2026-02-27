import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import api from "../services/api";
import socket from "../services/socket";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [severity, setSeverity] = useState("");
  const [error, setError] = useState("");

  const fetchAlerts = async () => {
    try {
      const res = await api.get(`/alerts${severity ? `?severity=${severity}` : ""}`);
      setAlerts(res.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load alerts.");
    }
  };

  useEffect(() => {
    fetchAlerts();
    const hourly = setInterval(fetchAlerts, 60 * 60 * 1000);
    socket.on("alert", fetchAlerts);
    return () => {
      clearInterval(hourly);
      socket.off("alert", fetchAlerts);
    };
  }, [severity]);

  const acknowledge = async (id) => {
    await api.post(`/alerts/${id}/ack`);
    fetchAlerts();
  };

  return (
    <div className="space-y-8 fade-in">
      <Topbar title="Alert Center" subtitle="Real-time alerts with acknowledgement" />

      <div className="flex items-center gap-3">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-lg bg-ink/60 border border-white/10"
        >
          <option value="">All Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="grid gap-4">
        {error && <div className="text-amber-300 text-sm">{error}</div>}
        {alerts.map((alert) => (
          <div key={alert.id} className="glass rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80">{alert.message}</div>
              <div className="text-xs text-white/50">{alert.severity}</div>
            </div>
            <button
              onClick={() => acknowledge(alert.id)}
              className="px-3 py-1 rounded-lg bg-teal text-ink text-sm"
            >
              Acknowledge
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
