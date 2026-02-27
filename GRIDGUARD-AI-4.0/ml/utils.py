import numpy as np


def simulate_readings(n=50000, seed=42):
    rng = np.random.default_rng(seed)
    voltage = rng.normal(230, 10, n)
    current = rng.normal(10, 2, n)
    power_kw = voltage * current / 1000
    loss_pct = np.clip(rng.normal(6, 2, n), 0, 20)

    # Inject anomalies
    anomaly_mask = rng.random(n) < 0.05
    loss_pct[anomaly_mask] += rng.normal(12, 4, anomaly_mask.sum())
    power_kw[anomaly_mask] *= rng.uniform(0.3, 0.6, anomaly_mask.sum())

    X = np.vstack([voltage, current, power_kw, loss_pct]).T
    return X
