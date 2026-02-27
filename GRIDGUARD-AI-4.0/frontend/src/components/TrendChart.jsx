import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function TrendChart({ trend }) {
  const labels = trend?.map((_, idx) => `T-${trend.length - idx}`) || [];
  const hasData = Array.isArray(trend) && trend.length > 0;
  const data = {
    labels,
    datasets: [
      {
        label: "Theft Probability",
        data: trend?.map((t) => Number(t.theft_probability || t.loss_percent || 0)) || [],
        borderColor: "#11b5b5",
        tension: 0.3
      }
    ]
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm text-white/70 mb-2">Historical Trend</div>
      {hasData ? (
        <Line data={data} options={{ plugins: { legend: { display: false } } }} />
      ) : (
        <div className="text-xs text-white/50 py-12 text-center">Click a region to load recent trend.</div>
      )}
    </div>
  );
}
