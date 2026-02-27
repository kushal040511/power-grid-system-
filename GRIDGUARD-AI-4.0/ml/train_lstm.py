import numpy as np
import tensorflow as tf


def generate_sequences(n_samples=10000, seq_len=24):
    rng = np.random.default_rng(42)
    data = rng.normal(0.6, 0.15, (n_samples, seq_len, 1))
    labels = (data.mean(axis=1) < 0.55).astype("float32")
    return data, labels


def main():
    X, y = generate_sequences()
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(X.shape[1], 1)),
        tf.keras.layers.LSTM(32, return_sequences=False),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid")
    ])
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    model.fit(X, y, epochs=5, batch_size=64, validation_split=0.2)
    model.save("models/transformer_lstm")
    print("Saved models/transformer_lstm")


if __name__ == "__main__":
    import os
    os.makedirs("models", exist_ok=True)
    main()
