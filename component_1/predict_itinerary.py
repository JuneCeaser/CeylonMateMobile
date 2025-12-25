import os
import json
from typing import Dict, Any

import numpy as np
import pandas as pd

from itinerary_model import ItineraryModel, haversine_distance

ROOT = os.path.join("..")
DATA_DIR = os.path.join(ROOT, "datasets")
MODELS_DIR = os.path.join(ROOT, "models", "component1")

ATTRACTIONS_PATH = os.path.join(DATA_DIR, "tourist_attractions.csv")
HOTELS_PATH = os.path.join(DATA_DIR, "hotels.csv")

# Hardcoded JSON input file
INPUT_JSON_PATH = os.path.join("sample_input_itinerary.json")


def load_catalogs():
    attractions = pd.read_csv(ATTRACTIONS_PATH)
    hotels = pd.read_csv(HOTELS_PATH)
    return attractions, hotels


def score_hotels(
    user: Dict[str, Any],
    hotels_df: pd.DataFrame,
    selected_attractions: pd.DataFrame,
) -> pd.DataFrame:
    df = hotels_df.copy()

    days = user.get("available_days", 3)
    total_budget = user.get("budget", 150000.0)
    nightly_max = total_budget / max(days, 1)

    if len(selected_attractions) > 0 and "latitude" in selected_attractions.columns:
        center_lat = selected_attractions["latitude"].mean()
        center_lon = selected_attractions["longitude"].mean()
    else:
        center_lat = user.get("start_latitude", np.nan)
        center_lon = user.get("start_longitude", np.nan)

    scores = []
    for _, h in df.iterrows():
        rating = h.get("rating", 4.0)
        nightly_rate = h.get("nightly_rate", h.get("price_per_night", 10000.0))

        lat = h.get("latitude", np.nan)
        lon = h.get("longitude", np.nan)

        if not np.isnan(center_lat) and not np.isnan(center_lon) and not np.isnan(lat) and not np.isnan(lon):
            dist = haversine_distance(center_lat, center_lon, lat, lon)
        else:
            dist = 10.0

        score = 0.0

        if nightly_rate <= nightly_max:
            score += 0.5
        elif nightly_rate <= nightly_max * 1.2:
            score += 0.2
        else:
            score -= 0.2

        score += 0.15 * (rating - 3.0)

        if dist < 2:
            score += 0.4
        elif dist < 5:
            score += 0.2
        elif dist < 15:
            score += 0.0
        else:
            score -= 0.2

        scores.append(score)

    df["score"] = scores
    df = df.sort_values(by="score", ascending=False)
    return df


def apply_contextual_adjustments(
    attractions_df: pd.DataFrame,
    scores: np.ndarray,
    context: Dict[str, Any],
) -> np.ndarray:

    if not context:
        return scores

    weather = context.get("weather", {})
    traffic = context.get("traffic", {})

    rainfall = float(weather.get("rainfall_mm", 0.0))
    temperature = float(weather.get("temperature", 28.0))
    congestion_level = float(traffic.get("congestion_level", 3.0))

    adjusted = scores.copy()

    for i, row in attractions_df.reset_index(drop=True).iterrows():
        factor = 1.0

        outdoor = bool(row.get("outdoor", True))
        category = str(row.get("category", "")).lower()
        duration = float(row.get("avg_duration_hours", 2.0))

        if outdoor and rainfall > 30:
            factor *= 0.5
        elif outdoor and rainfall > 10:
            factor *= 0.8

        if temperature > 32 and ("hike" in category or duration >= 6):
            factor *= 0.7

        dist_km = row.get("distance_km", None)
        if dist_km is not None and not np.isnan(dist_km):
            if congestion_level >= 8 and dist_km > 50:
                factor *= 0.6
            elif congestion_level >= 6 and dist_km > 30:
                factor *= 0.8

        adjusted[i] = adjusted[i] * factor

    return adjusted


def main():
    # Always load from hard-coded JSON file
    with open(INPUT_JSON_PATH, "r", encoding="utf-8") as f:
        input_data = json.load(f)

    user = input_data.get("user_preferences", {})
    context = input_data.get("context", {})

    model = ItineraryModel()
    model.load(MODELS_DIR)

    attractions_df, hotels_df = load_catalogs()

    tb = model.predict_time_and_budget(user)

    scored_attractions = model.score_attractions_for_user(user, attractions_df)

    if "start_latitude" in user and "start_longitude" in user:
        start_lat = user["start_latitude"]
        start_lon = user["start_longitude"]
        dists = []
        for _, row in scored_attractions.iterrows():
            lat = row.get("latitude", np.nan)
            lon = row.get("longitude", np.nan)
            if not np.isnan(start_lat) and not np.isnan(start_lon) and not np.isnan(lat) and not np.isnan(lon):
                dists.append(haversine_distance(start_lat, start_lon, lat, lon))
            else:
                dists.append(np.nan)
        scored_attractions["distance_km"] = dists

    base_scores = scored_attractions["score"].values
    adjusted_scores = apply_contextual_adjustments(scored_attractions, base_scores, context)
    scored_attractions["score_contextual"] = adjusted_scores

    scored_attractions = scored_attractions.sort_values(by="score_contextual", ascending=False)

    max_attractions = user.get("max_attractions", 8)
    min_score = user.get("min_attraction_score", 0.2)

    total_budget = user.get("budget", tb["estimated_total_budget"])
    budget_per_attraction = total_budget / max(max_attractions, 1)

    filtered_attractions = []
    time_acc = 0.0
    budget_acc = 0.0

    for _, row in scored_attractions.iterrows():
        if row["score_contextual"] < min_score:
            continue

        est_cost = row.get("avg_cost", budget_per_attraction)
        est_duration = row.get("avg_duration_hours", 3.0)

        if budget_acc + est_cost > total_budget * 1.1:
            continue
        if time_acc + est_duration > tb["estimated_total_time_hours"] * 1.1:
            continue

        filtered_attractions.append(row)
        budget_acc += est_cost
        time_acc += est_duration

        if len(filtered_attractions) >= max_attractions:
            break

    selected_attractions_df = pd.DataFrame(filtered_attractions)

    hotel_candidates = score_hotels(user, hotels_df, selected_attractions_df)
    top_hotels = hotel_candidates.head(user.get("max_hotels", 5))

    result = {
        "estimated_total_time_hours": tb["estimated_total_time_hours"],
        "estimated_total_budget": tb["estimated_total_budget"],
        "selected_attractions": selected_attractions_df.to_dict(orient="records"),
        "recommended_hotels": top_hotels.to_dict(orient="records"),
    }

    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
