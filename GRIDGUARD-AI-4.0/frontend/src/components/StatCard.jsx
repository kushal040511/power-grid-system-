export default function StatCard({ label, value, trend }) {
  return (
    <div className="glass gradient-border rounded-2xl p-5">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-2 text-3xl font-display font-semibold">{value}</div>
      {trend && <div className="mt-2 text-xs text-teal">{trend}</div>}
    </div>
  );
}
