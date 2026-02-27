import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import api from "../services/api";

export default function Reports() {
  const [boardNote, setBoardNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = async () => {
    setLoadingPreview(true);
    setError("");
    try {
      const res = await api.get("/reports/preview", {
        params: boardNote ? { note: boardNote } : {}
      });
      setPreview(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load live report preview.");
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, []);

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await api.post("/reports", { extraNote: boardNote });
      const reportId = res.data.id;
      const fileRes = await api.get(`/reports/${reportId}`, { responseType: "blob" });

      const url = window.URL.createObjectURL(new Blob([fileRes.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "gridguard-executive-report.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPreview((prev) =>
        prev
          ? {
              ...prev,
              generatedAt: res.data.generatedAt || prev.generatedAt,
              summary: res.data.summary || prev.summary,
              keyMetrics: res.data.keyMetrics || prev.keyMetrics
            }
          : prev
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate formal report.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <Topbar title="Reports" subtitle="Formal executive PDF based on live grid data" />

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="text-sm text-white/70">Optional Board Note (appended in report)</div>
        <textarea
          value={boardNote}
          onChange={(e) => setBoardNote(e.target.value)}
          className="w-full h-24 rounded-lg bg-ink/60 border border-white/10"
          placeholder="Add formal board-level note, strategic directive, or audit emphasis."
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadPreview}
            disabled={loadingPreview}
            className="px-4 py-2 rounded-lg bg-white/10 text-white font-semibold disabled:opacity-60"
          >
            {loadingPreview ? "Refreshing..." : "Refresh Live Preview"}
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-teal text-ink font-semibold disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate Formal PDF"}
          </button>
        </div>

        {error && <div className="text-amber-300 text-sm">{error}</div>}
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="text-sm text-white/70">Live Executive Preview</div>
        <div className="text-xs text-white/50">
          Generated at: {preview?.generatedAt || "N/A"}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {(preview?.keyMetrics || []).map((m) => (
            <div key={m.label} className="rounded-xl border border-white/10 bg-ink/40 p-3">
              <div className="text-xs text-white/60">{m.label}</div>
              <div className="text-base text-white/90">{m.value}</div>
            </div>
          ))}
        </div>

        <textarea
          value={preview?.summary || ""}
          readOnly
          className="w-full h-72 rounded-lg bg-ink/60 border border-white/10"
        />

        <div className="space-y-3">
          {(preview?.sections || []).map((section) => (
            <div key={section.title} className="rounded-xl border border-white/10 bg-ink/40 p-4">
              <div className="text-sm text-white/90 font-semibold">{section.title}</div>
              <div className="mt-2 space-y-1 text-xs text-white/70">
                {(section.lines || []).map((line, idx) => (
                  <div key={`${section.title}-line-${idx}`}>{line}</div>
                ))}
                {(section.items || []).slice(0, 6).map((item, idx) => (
                  <div key={`${section.title}-item-${idx}`}>- {item}</div>
                ))}
                {(section.items || []).length > 6 && (
                  <div>...and {(section.items || []).length - 6} more entries in the PDF report.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
