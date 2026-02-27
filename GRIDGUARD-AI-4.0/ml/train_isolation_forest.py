import joblib
from sklearn.ensemble import IsolationForest
from utils import simulate_readings


def main():
    X = simulate_readings(60000)
    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
    model.fit(X)
    joblib.dump(model, "models/isolation_forest.joblib")
    print("Saved models/isolation_forest.joblib")


if __name__ == "__main__":
    import os
    os.makedirs("models", exist_ok=True)
    main()
