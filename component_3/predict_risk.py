import json
import os
from typing import List, Dict, Any

import pandas as pd
from risk_model import RiskStackingModel


# Models path stays the same
MODELS_DIR = os.path.join("..", "models", "component3")
MODEL_PREFIX = os.path.join(MODELS_DIR, "risk_model")

# Hard-coded JSON input in the same folder
INPUT_JSON_PATH = os.path.join(os.path.dirname(__file__), "sample_risk_input.json")


def build_default_row(location: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "timestamp": location.get("timestamp", pd.Timestamp.now().isoformat()),

        # Accept BOTH styles of input
        "temperature": location.get("temperature", location.get("temp", 28.0)),
        "rainfall_mm": location.get("rainfall_mm", location.get("rain", 0.0)),
        "wind_speed": location.get("wind_speed", location.get("wind", 5.0)),

        "humidity": location.get("humidity", 75.0),
        "visibility_km": location.get("visibility_km", 10.0),

        "traffic_congestion_level": location.get("traffic_congestion_level", location.get("congestion", 3.0)),
        "average_speed": location.get("average_speed", location.get("speed", 40.0)),
        "traffic_volume": location.get("traffic_volume", location.get("volume", 100.0)),

        "num_recent_accidents": location.get("num_recent_accidents", location.get("accidents", 0.0)),
        "num_recent_incidents": location.get("num_recent_incidents", location.get("events", 0.0)),
    }


def main():
    # Always load the hard-coded JSON input
    with open(INPUT_JSON_PATH, "r", encoding="utf-8") as f:
        input_data = json.load(f)

    if "locations" in input_data:
        locations = input_data["locations"]
    else:
        locations = [input_data]

    model = RiskStackingModel()
    model.load_models(MODEL_PREFIX)

    results = []

    for loc in locations:
        row = build_default_row(loc)
        pred = model.predict_for_row(row)

        risk_factors = []

        if row["rainfall_mm"] > 50:
            risk_factors.append("Heavy rainfall (possible flooding)")
        if row["traffic_congestion_level"] >= 8:
            risk_factors.append("Severe traffic congestion")
        if row["num_recent_accidents"] >= 3:
            risk_factors.append("Multiple recent accidents nearby")
        if row["num_recent_incidents"] >= 3:
            risk_factors.append("Multiple recent incidents reported")

        recommendations = []
        if pred["risk_score"] >= 0.6:
            recommendations.append("Avoid this area and choose an alternative route.")
        elif pred["risk_score"] >= 0.3:
            recommendations.append("Exercise caution and monitor conditions.")
        else:
            recommendations.append("Area appears safe for travel.")

        result_item = {
            "name": loc.get("name", "Unknown"),
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
            "risk_score": pred["risk_score"],
            "risk_category": pred["risk_category"],
            "severity_level": pred["severity_level"],
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "category_probabilities": pred["category_probabilities"],
        }

        results.append(result_item)

    print(json.dumps({"results": results}, default=str))


if __name__ == "__main__":
    main()
