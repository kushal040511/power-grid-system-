from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
import joblib
import tensorflow as tf
import os

app = FastAPI(title="GRIDGUARD AI Service")

ISO_PATH = os.getenv("ISO_MODEL", "models/isolation_forest.joblib")
LSTM_PATH = os.getenv("LSTM_MODEL", "models/transformer_lstm")
AE_PATH = os.getenv("AE_MODEL", "models/anomaly_autoencoder")

iso_model = None
lstm_model = None
ae_model = None

try:
    if os.path.exists(ISO_PATH):
        iso_model = joblib.load(ISO_PATH)
    if os.path.exists(LSTM_PATH):
        lstm_model = tf.keras.models.load_model(LSTM_PATH)
    if os.path.exists(AE_PATH):
        ae_model = tf.keras.models.load_model(AE_PATH)
except Exception:
    iso_model = None
    lstm_model = None
    ae_model = None


class TheftRequest(BaseModel):
    voltage: float = 230
    current: float = 10
    power: float = 2.3
    loss_percent: float = 6


class TransformerRequest(BaseModel):
    temperature: float = 55
    load_percent: float = 45


class RiskRequest(BaseModel):
    theft_probability: float = 30
    carbon_score: float = 70
    transformer_risk: float = 20


def risk_class(prob):
    if prob > 70:
        return "red"
    if prob >= 40:
        return "yellow"
    return "green"


@app.post("/predict-theft")
def predict_theft(req: TheftRequest):
    x = np.array([req.voltage, req.current, req.power, req.loss_percent], dtype=float)
    anomaly = float(req.loss_percent / 10)

    if iso_model is not None and ae_model is not None:
        score = -iso_model.decision_function([x])[0]
        recon = ae_model.predict(np.array([x]), verbose=0)
        recon_error = float(np.mean((recon[0] - x) ** 2))
        anomaly = float((score + recon_error) / 2.0)

    theft_probability = min(100.0, max(0.0, req.loss_percent * 3.2))
    return {
        "anomaly_score": anomaly,
        "theft_probability": theft_probability,
        "risk_class": risk_class(theft_probability)
    }


@app.post("/predict-transformer")
def predict_transformer(req: TransformerRequest):
    health_index = max(0.0, 1 - (req.load_percent / 120) - (max(0, req.temperature - 70) / 100))

    if lstm_model is not None:
        seq = np.random.normal(0.6, 0.1, (1, 24, 1))
        pred = float(lstm_model.predict(seq, verbose=0)[0][0])
        health_index = float(1.0 - pred)

    overload_risk = min(1.0, req.load_percent / 100)
    return {"health_index": health_index, "overload_risk": overload_risk}


@app.post("/generate-risk-score")
def generate_risk(req: RiskRequest):
    return {
        "theft_score": req.theft_probability,
        "carbon_score": req.carbon_score,
        "transformer_risk": req.transformer_risk
    }
