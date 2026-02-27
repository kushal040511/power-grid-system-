export default function Topbar({ title, subtitle }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-display font-semibold">{title}</h1>
        <p className="text-white/60">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full bg-teal/20 text-teal text-sm">Live</span>
        <span className="text-sm text-white/60">India Grid Status</span>
      </div>
    </div>
  );
}
