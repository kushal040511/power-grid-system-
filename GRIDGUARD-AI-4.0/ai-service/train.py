import os
import numpy as np
import joblib
import tensorflow as tf
from sklearn.ensemble import IsolationForest


def simulate_readings(n=60000, seed=42):
    rng = np.random.default_rng(seed)
    voltage = rng.normal(230, 10, n)
    current = rng.normal(10, 2, n)
    power_kw = voltage * current / 1000
    loss_pct = np.clip(rng.normal(6, 2, n), 0, 20)

    anomaly_mask = rng.random(n) < 0.05
    loss_pct[anomaly_mask] += rng.normal(12, 4, anomaly_mask.sum())
    power_kw[anomaly_mask] *= rng.uniform(0.3, 0.6, anomaly_mask.sum())

    X = np.vstack([voltage, current, power_kw, loss_pct]).T
    return X


def train_iso(X):
    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
    model.fit(X)
    joblib.dump(model, "models/isolation_forest.joblib")


def train_lstm():
    rng = np.random.default_rng(42)
    data = rng.normal(0.6, 0.15, (10000, 24, 1))
    labels = (data.mean(axis=1) < 0.55).astype("float32")

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(24, 1)),
        tf.keras.layers.LSTM(32, return_sequences=False),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid")
    ])
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    model.fit(data, labels, epochs=5, batch_size=64, validation_split=0.2)
    model.save("models/transformer_lstm")


def train_autoencoder(X):
    scaler = tf.keras.layers.Normalization()
    scaler.adapt(X)

    encoder = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(X.shape[1],)),
        scaler,
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(8, activation="relu")
    ])

    decoder = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(8,)),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(X.shape[1])
    ])

    inp = tf.keras.Input(shape=(X.shape[1],))
    encoded = encoder(inp)
    decoded = decoder(encoded)
    autoencoder = tf.keras.Model(inp, decoded)
    autoencoder.compile(optimizer="adam", loss="mse")
    autoencoder.fit(X, X, epochs=5, batch_size=128, validation_split=0.2)
    autoencoder.save("models/anomaly_autoencoder")


if __name__ == "__main__":
    os.makedirs("models", exist_ok=True)
    X = simulate_readings()
    train_iso(X)
    train_lstm()
    train_autoencoder(X)
    print("Training complete. Models saved in models/")
