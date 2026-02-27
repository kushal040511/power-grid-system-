import joblib
import numpy as np
import tensorflow as tf


def load_models():
    iso = joblib.load("models/isolation_forest.joblib")
    lstm = tf.keras.models.load_model("models/transformer_lstm")
    auto = tf.keras.models.load_model("models/anomaly_autoencoder")
    return iso, lstm, auto


def score_reading(iso, auto, x):
    score = -iso.decision_function([x])[0]
    recon = auto.predict(np.array([x]), verbose=0)
    recon_error = np.mean((recon[0] - x) ** 2)
    combined = float((score + recon_error) / 2.0)
    return combined


def transformer_health(lstm, sequence):
    pred = float(lstm.predict(np.array([sequence]), verbose=0)[0][0])
    return 1.0 - pred


if __name__ == "__main__":
    iso, lstm, auto = load_models()
    sample = np.array([230, 12, 2.6, 8.0])
    score = score_reading(iso, auto, sample)
    sequence = np.random.normal(0.6, 0.1, (24, 1))
    health = transformer_health(lstm, sequence)
    print({"anomaly_score": score, "health_index": health})
