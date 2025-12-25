import os
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from flask import Blueprint, request, jsonify
from datetime import datetime

component3_bp = Blueprint("component3", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models", "component3")
MODEL_PREFIX = os.path.join(MODEL_DIR, "risk_model")

# Load base models
weather_model = joblib.load(f"{MODEL_PREFIX}_weather.pkl")
traffic_model = joblib.load(f"{MODEL_PREFIX}_traffic.pkl")
incident_model = joblib.load(f"{MODEL_PREFIX}_incident.pkl")
label_encoder = joblib.load(f"{MODEL_PREFIX}_label_encoder.pkl")

# Load fusion model — NO BUILD REQUIRED
fusion_model = tf.keras.models.load_model(f"{MODEL_PREFIX}_fusion.h5")

@component3_bp.route("/predict", methods=["POST"])
def predict_risk():
    data = request.json

    timestamp = pd.to_datetime(
        data.get("timestamp", datetime.utcnow().isoformat())
    )
    hour = timestamp.hour / 23.0
    day = timestamp.dayofweek / 6.0

    weather = np.array([[
        data.get("temperature", data.get("temp", 28.0)),
        data.get("rainfall_mm", data.get("rain", 0.0)),
        data.get("wind_speed", data.get("wind", 5.0)),
        data.get("humidity", 75.0),
        data.get("visibility_km", 10.0),
    ]])

    traffic = np.array([[
        data.get("traffic_congestion_level", data.get("congestion", 3.0)),
        data.get("average_speed", data.get("speed", 40.0)),
        data.get("traffic_volume", data.get("volume", 100.0)),
    ]])

    incident = np.array([[
        data.get("num_recent_accidents", data.get("accidents", 0.0)),
        data.get("num_recent_incidents", data.get("events", 0.0)),
    ]])

    w = float(weather_model.predict(weather)[0])
    t = float(traffic_model.predict(traffic)[0])
    i = float(incident_model.predict(incident)[0])

    fusion_input = np.array([[w, t, i, hour, day]])
    preds = fusion_model.predict(fusion_input, verbose=0)

    risk_score = float(preds[0][0][0])
    cat_probs = preds[1][0]
    severity = float(preds[2][0][0])

    cat_idx = int(np.argmax(cat_probs))
    risk_category = label_encoder.inverse_transform([cat_idx])[0]

    label_map = {
        "safe": "LOW",
        "medium": "MEDIUM",
        "low": "HIGH"
    }

    risk_category = label_map.get(risk_category, risk_category)

    category_probabilities = {
        label_map.get(cls, cls): float(cat_probs[i])
        for i, cls in enumerate(label_encoder.classes_)
    }
    return jsonify({
        "risk_score": risk_score,
        "risk_category": risk_category,
        "severity_level": severity,
        "weather_risk": w,
        "traffic_risk": t,
        "incident_risk": i,
        "category_probabilities": category_probabilities
    })
