import numpy as np
import tensorflow as tf
from utils import simulate_readings


def main():
    X = simulate_readings(60000)
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
    print("Saved models/anomaly_autoencoder")


if __name__ == "__main__":
    import os
    os.makedirs("models", exist_ok=True)
    main()
