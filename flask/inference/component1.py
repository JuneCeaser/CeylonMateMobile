import os
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from flask import Blueprint, request, jsonify

component1_bp = Blueprint("component1", __name__)

# Paths

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # /flask
MODEL_DIR = os.path.join(BASE_DIR, "models", "component1")

ATTRACTIONS_PATH = os.path.join(MODEL_DIR, "tourist_attractions.csv")
HOTELS_PATH = os.path.join(MODEL_DIR, "hotels.csv")

# Load models and catalogs

time_model = joblib.load(os.path.join(MODEL_DIR, "time_model.pkl"))
budget_model = joblib.load(os.path.join(MODEL_DIR, "budget_model.pkl"))
xgb_model = joblib.load(os.path.join(MODEL_DIR, "attraction_model.pkl"))
fusion_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "fusion_model.h5"))

attractions_df = pd.read_csv(ATTRACTIONS_PATH)
hotels_df = pd.read_csv(HOTELS_PATH)


# Helper: Hotel Scoring (same as local inference)

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return R * (2 * np.arcsin(np.sqrt(a)))


def score_hotels(user, selected_attractions):
    df = hotels_df.copy()

    days = user.get("available_days", 3)
    total_budget = user.get("budget", 150000.0)
    nightly_max = total_budget / max(days, 1)

    if len(selected_attractions) > 0:
        center_lat = selected_attractions["latitude"].mean()
        center_lon = selected_attractions["longitude"].mean()
    else:
        center_lat = user.get("start_latitude", np.nan)
        center_lon = user.get("start_longitude", np.nan)

    scores = []
    for _, h in df.iterrows():
        rating = h.get("rating", 4.0)
        rate = h.get("nightly_rate", h.get("price_per_night", 10000.0))

        lat = h.get("latitude", np.nan)
        lon = h.get("longitude", np.nan)

        if not np.isnan(center_lat) and not np.isnan(lat):
            dist = haversine_distance(center_lat, center_lon, lat, lon)
        else:
            dist = 10.0

        score = 0.15 * (rating - 3.0)
        score += 0.5 if rate <= nightly_max else -0.2
        score += 0.4 if dist < 2 else (0.2 if dist < 5 else -0.2)

        scores.append(score)

    df["score"] = scores
    return df.sort_values(by="score", ascending=False)


# ROUTE: Predict time + budget

@component1_bp.route("/predict_time_budget", methods=["POST"])
def predict_time_budget():
    user = request.json or {}

    X = pd.DataFrame([user])
    time_pred = float(time_model.predict(X)[0])
    budget_pred = float(budget_model.predict(X)[0])

    return jsonify({
        "estimated_total_time_hours": time_pred,
        "estimated_total_budget": budget_pred
    })


# ROUTE: Full Recommendation (Attractions + Hotels)

@component1_bp.route("/recommend", methods=["POST"])
def recommend_itinerary():
    user = request.json or {}

    #  Predict total time & budget
    X = pd.DataFrame([user])
    total_time = float(time_model.predict(X)[0])
    total_budget = float(budget_model.predict(X)[0])

    #  Score attractions using both models (base + fusion)
    rows = []
    for _, att in attractions_df.iterrows():
        row = {
            "budget": user["budget"],
            "available_days": user["available_days"],
            "num_travelers": user["num_travelers"],
            "distance_preference": user["distance_preference"],
            "activity_type": user.get("activity_type", "general"),
            "season": user.get("season", "any"),

            "attraction_category": att.get("category", "general"),
            "attraction_best_season": att.get("best_season", "any"),
            "attraction_accessibility": att.get("accessibility", "medium"),
            "attraction_outdoor": 1.0 if bool(att.get("outdoor", True)) else 0.0,

            "attraction_avg_cost": att.get("avg_cost", 0.0),
            "attraction_avg_duration": att.get("avg_duration_hours", 2.0),
            "attraction_popularity_score": att.get("popularity_score", 3.0),
            "attraction_tourist_density": att.get("tourist_density", 3.0),
            "attraction_safety_rating": att.get("safety_rating", 3.0),
        }

        # distance_km feature (if possible)
        start_lat = user.get("start_latitude", np.nan)
        start_lon = user.get("start_longitude", np.nan)
        lat = att.get("latitude", np.nan)
        lon = att.get("longitude", np.nan)

        if not np.isnan(start_lat) and not np.isnan(lat):
            row["distance_km"] = haversine_distance(start_lat, start_lon, lat, lon)
        else:
            row["distance_km"] = np.nan

        rows.append(row)

    feat_df = pd.DataFrame(rows)

    # Fill any NaN distance so XGBoost works
    feat_df["distance_km"] = feat_df["distance_km"].fillna(feat_df["distance_km"].median())

    # MUST include attr_category columns before model call
    base_prob = xgb_model.predict_proba(feat_df)[:, 1]

    # Fusion scoring

    budget = feat_df["budget"].values
    days = np.maximum(feat_df["available_days"].values, 1.0)
    dist_pref = np.maximum(feat_df["distance_preference"].values, 1.0)
    avg_cost = feat_df["attraction_avg_cost"].values
    avg_dur = feat_df["attraction_avg_duration"].values
    dist_km = feat_df["distance_km"].values

    # Derived ratios — just like training
    daily_budget = budget / days
    cost_ratio = avg_cost / np.maximum(daily_budget, 1.0)
    max_hours = days * 8.0
    duration_ratio = avg_dur / np.maximum(max_hours, 1.0)
    distance_ratio = dist_km / dist_pref

    cost_ratio = np.clip(cost_ratio, 0.0, 5.0)
    duration_ratio = np.clip(duration_ratio, 0.0, 5.0)
    distance_ratio = np.clip(distance_ratio, 0.0, 5.0)

    # Must be shape: (N, 4)
    X_fusion = np.column_stack([
        base_prob,
        cost_ratio,
        duration_ratio,
        distance_ratio,
    ])

    fusion_prob = fusion_model.predict(X_fusion, verbose=0).ravel()

    scored = attractions_df.copy()
    scored["score"] = fusion_prob
    scored = scored.sort_values(by="score", ascending=False)

    # Select attractions under time + budget
    max_attractions = user.get("max_attractions", 8)
    selected = []
    time_acc = 0
    budget_acc = 0

    for _, att in scored.iterrows():
        cost = att.get("avg_cost", total_budget / max_attractions)
        hours = att.get("avg_duration_hours", 3.0)

        if budget_acc + cost <= total_budget and time_acc + hours <= total_time:
            selected.append(att)
            time_acc += hours
            budget_acc += cost

        if len(selected) >= max_attractions:
            break

    selected_df = pd.DataFrame(selected)

    #  Recommend hotels
    hotel_candidates = score_hotels(user, selected_df)
    top_hotels = hotel_candidates.head(user.get("max_hotels", 5))

    return jsonify({
        "estimated_total_time_hours": total_time,
        "estimated_total_budget": total_budget,
        "selected_attractions": selected_df.to_dict(orient="records"),
        "recommended_hotels": top_hotels.to_dict(orient="records")
    })
