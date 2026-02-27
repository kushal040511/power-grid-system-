export default function AlertList({ alerts }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="text-sm text-white/70">Live Alert Feed</div>
      {alerts?.length ? (
        alerts.map((alert) => (
          <div key={alert.id || alert.message} className="flex items-start justify-between">
            <div>
              <div className="text-white/80 text-sm">{alert.message}</div>
              <div className="text-xs text-white/40">{alert.severity}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${alert.severity === "high" ? "bg-ember/20 text-ember" : "bg-sun/20 text-sun"}`}>
              {alert.acknowledged ? "ACK" : "OPEN"}
            </span>
          </div>
        ))
      ) : (
        <div className="text-white/50 text-sm">No alerts</div>
      )}
    </div>
  );
}
