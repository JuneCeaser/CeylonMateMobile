import os
import json
from typing import Dict, Any, List, Tuple, Optional

import numpy as np
import pandas as pd

from itinerary_model import ItineraryModel, haversine_distance

ROOT = os.path.join("../..")
DATA_DIR = os.path.join(ROOT, "datasets")
MODELS_DIR = os.path.join(ROOT, "models", "component1")

ATTRACTIONS_PATH = os.path.join(DATA_DIR, "tourist_attractions.csv")
HOTELS_PATH = os.path.join(DATA_DIR, "hotels-new.csv")

INPUT_JSON_PATH = os.path.join("sample_input_itinerary.json")


# Helpers


def _safe_float(x, default: float) -> float:
    try:
        if x is None:
            return default
        return float(x)
    except Exception:
        return default


def _safe_int(x, default: int) -> int:
    try:
        if x is None:
            return default
        return int(float(x))
    except Exception:
        return default


def _get_user_start(user: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    lat = user.get("start_latitude", None)
    lon = user.get("start_longitude", None)
    try:
        lat = float(lat) if lat is not None else None
        lon = float(lon) if lon is not None else None
    except Exception:
        return None, None
    if lat is None or lon is None:
        return None, None
    if np.isnan(lat) or np.isnan(lon):
        return None, None
    return lat, lon


def load_catalogs():
    attractions = pd.read_csv(ATTRACTIONS_PATH)
    hotels = pd.read_csv(HOTELS_PATH)

    # Parse comma-separated amenities into a list
    hotels['amenities'] = hotels['amenities'].fillna("").apply(
        lambda a: [x.strip() for x in a.split(',')] if isinstance(a, str) else []
    )

    # If your script expects "room_types" and "contact" but they no longer exist,
    # add dummy columns so the rest of the script won't break later:
    hotels['room_types'] = [[] for _ in range(len(hotels))]
    hotels['contact'] = [""] * len(hotels)

    # Ensure review_count exists
    if 'review_count' not in hotels.columns:
        hotels['review_count'] = 0
    return attractions, hotels


def _estimate_speed_kmph(context: Dict[str, Any]) -> float:
    """
    Conservative travel speed estimate.
    Congestion reduces speed; keep in a safe range.
    """
    traffic = (context or {}).get("traffic", {}) if context else {}
    congestion = _safe_float(traffic.get("congestion_level", 3.0), 3.0)  # 0..10
    base = 45.0
    base *= max(0.55, 1.0 - 0.06 * max(0.0, congestion - 3.0))
    return float(np.clip(base, 20.0, 60.0))


def _estimate_transport_cost_per_km_lkr(user: Dict[str, Any]) -> float:
    # default suitable for private vehicle/taxi blended estimate
    return float(np.clip(_safe_float(user.get("transport_cost_per_km_lkr", 120.0), 120.0), 50.0, 400.0))


def _nanmed(series: pd.Series, default: float) -> float:
    try:
        s = pd.to_numeric(series, errors="coerce")
        m = float(np.nanmedian(s.values))
        if np.isnan(m):
            return default
        return m
    except Exception:
        return default


# -----------------------------
# Contextual adjustments (keep yours)
# -----------------------------

def apply_contextual_adjustments(
    attractions_df: pd.DataFrame,
    scores: np.ndarray,
    context: Dict[str, Any],
) -> np.ndarray:
    if not context:
        return scores

    weather = context.get("weather", {})
    traffic = context.get("traffic", {})

    rainfall = _safe_float(weather.get("rainfall_mm", 0.0), 0.0)
    temperature = _safe_float(weather.get("temperature", 28.0), 28.0)
    congestion_level = _safe_float(traffic.get("congestion_level", 3.0), 3.0)

    adjusted = scores.copy()

    for i, row in attractions_df.reset_index(drop=True).iterrows():
        factor = 1.0

        outdoor = bool(row.get("outdoor", True))
        category = str(row.get("category", "")).lower()
        duration = _safe_float(row.get("avg_duration_hours", 2.0), 2.0)

        if outdoor and rainfall > 30:
            factor *= 0.5
        elif outdoor and rainfall > 10:
            factor *= 0.8

        if temperature > 32 and ("hike" in category or duration >= 6):
            factor *= 0.7

        dist_km = row.get("distance_km", None)
        if dist_km is not None and not (isinstance(dist_km, float) and np.isnan(dist_km)):
            dist_km = _safe_float(dist_km, 0.0)
            if congestion_level >= 8 and dist_km > 50:
                factor *= 0.6
            elif congestion_level >= 6 and dist_km > 30:
                factor *= 0.8

        adjusted[i] = adjusted[i] * factor

    return adjusted


# -----------------------------
# Perfect ranking layer (robust even if fusion is constant)
# -----------------------------

def _is_almost_constant(arr: np.ndarray, tol: float = 1e-4) -> bool:
    if arr is None or len(arr) < 5:
        return False
    a = np.asarray(arr, dtype=float)
    a = a[np.isfinite(a)]
    if len(a) < 5:
        return False
    return float(np.nanmax(a) - np.nanmin(a)) < tol


def _build_final_rank_score(
    scored_df: pd.DataFrame,
    user: Dict[str, Any],
    context: Dict[str, Any],
) -> pd.DataFrame:
    """
    If fusion output is constant (like your output), use score_base
    and apply realistic penalties:
      - cost vs daily budget
      - duration vs daily time
      - distance vs preference
      - weather/traffic penalties (already done separately)
    """
    df = scored_df.copy()

    days = max(1, _safe_int(user.get("available_days", 3), 3))
    total_budget = _safe_float(user.get("budget", 150000.0), 150000.0)
    daily_budget = total_budget / days

    day_hours = float(np.clip(_safe_float(user.get("day_hours", 8.5), 8.5), 6.0, 12.0))
    daily_hours = day_hours

    dist_pref = float(np.clip(_safe_float(user.get("distance_preference", 80.0), 80.0), 20.0, 300.0))

    # use base learner probability as the “true” ranking anchor
    base = pd.to_numeric(df.get("score_base", 0.0), errors="coerce").fillna(0.0).values
    base = np.clip(base, 0.0, 1.0)

    cost = pd.to_numeric(df.get("avg_cost", 0.0), errors="coerce").fillna(_nanmed(df.get("avg_cost", pd.Series([0])), 2500)).values
    dur = pd.to_numeric(df.get("avg_duration_hours", 3.0), errors="coerce").fillna(_nanmed(df.get("avg_duration_hours", pd.Series([3])), 3.0)).values

    dist_km = pd.to_numeric(df.get("distance_km", np.nan), errors="coerce").values
    # if distance_km missing, treat as moderate
    dist_km = np.where(np.isfinite(dist_km), dist_km, dist_pref * 0.6)

    # ratios
    cost_ratio = cost / max(daily_budget, 1.0)         # >1 is expensive
    dur_ratio = dur / max(daily_hours, 1.0)            # >1 consumes the day
    dist_ratio = dist_km / max(dist_pref, 1.0)         # >1 beyond preference

    # penalty curves (smooth)
    cost_pen = np.clip(cost_ratio - 0.6, 0.0, 2.5)      # no penalty until ~60% of daily budget
    dur_pen = np.clip(dur_ratio - 0.55, 0.0, 2.5)       # no penalty until ~55% of daily time
    dist_pen = np.clip(dist_ratio - 0.7, 0.0, 3.0)      # no penalty until ~70% of distance_pref

    # accessibility & safety help
    safety = pd.to_numeric(df.get("safety_rating", 0.8), errors="coerce").fillna(0.8).values
    access = pd.to_numeric(df.get("accessibility", 0.7), errors="coerce").fillna(0.7).values
    pop = pd.to_numeric(df.get("popularity_score", 0.6), errors="coerce").fillna(0.6).values

    bonus = 0.10 * np.clip(safety, 0.0, 1.0) + 0.06 * np.clip(access, 0.0, 1.0) + 0.06 * np.clip(pop, 0.0, 1.0)

    # final robust score
    final = (
        0.72 * base
        + bonus
        - 0.15 * cost_pen
        - 0.12 * dur_pen
        - 0.16 * dist_pen
    )

    df["rank_score"] = np.clip(final, 0.0, 1.0)
    return df


# -----------------------------
# Geographic coherence + routing
# -----------------------------

def _pick_geographic_cluster(scored_df: pd.DataFrame, anchor_idx: int, radius_km: float) -> pd.DataFrame:
    anchor = scored_df.iloc[anchor_idx]
    a_lat = _safe_float(anchor.get("latitude", np.nan), np.nan)
    a_lon = _safe_float(anchor.get("longitude", np.nan), np.nan)
    if np.isnan(a_lat) or np.isnan(a_lon):
        return scored_df.copy()

    d = []
    for _, row in scored_df.iterrows():
        lat = _safe_float(row.get("latitude", np.nan), np.nan)
        lon = _safe_float(row.get("longitude", np.nan), np.nan)
        if np.isnan(lat) or np.isnan(lon):
            d.append(np.inf)
        else:
            d.append(haversine_distance(a_lat, a_lon, lat, lon))

    out = scored_df.copy()
    out["cluster_dist_km"] = d
    out = out[out["cluster_dist_km"] <= radius_km].copy()
    return out


def _route_nearest_neighbor(points_df: pd.DataFrame, start_lat: Optional[float], start_lon: Optional[float]) -> pd.DataFrame:
    df = points_df.copy().reset_index(drop=True)
    if len(df) <= 1:
        df["travel_from_prev_km"] = 0.0
        return df

    coords = []
    for _, r in df.iterrows():
        coords.append((_safe_float(r.get("latitude", np.nan), np.nan), _safe_float(r.get("longitude", np.nan), np.nan)))

    remaining = list(range(len(df)))
    ordered = []

    def dist_to(i: int, lat: float, lon: float) -> float:
        a_lat, a_lon = coords[i]
        if np.isnan(a_lat) or np.isnan(a_lon) or np.isnan(lat) or np.isnan(lon):
            return np.inf
        return haversine_distance(lat, lon, a_lat, a_lon)

    if start_lat is not None and start_lon is not None and not (np.isnan(start_lat) or np.isnan(start_lon)):
        cur_lat, cur_lon = start_lat, start_lon
        start_i = min(remaining, key=lambda i: dist_to(i, cur_lat, cur_lon))
    else:
        start_i = remaining[0]
        cur_lat, cur_lon = coords[start_i]

    ordered.append(start_i)
    remaining.remove(start_i)

    while remaining:
        next_i = min(remaining, key=lambda i: dist_to(i, cur_lat, cur_lon))
        ordered.append(next_i)
        remaining.remove(next_i)
        nxt_lat, nxt_lon = coords[next_i]
        if not (np.isnan(nxt_lat) or np.isnan(nxt_lon)):
            cur_lat, cur_lon = nxt_lat, nxt_lon

    df = df.iloc[ordered].reset_index(drop=True)

    travel = [0.0]
    for i in range(1, len(df)):
        p = df.iloc[i - 1]
        c = df.iloc[i]
        p_lat = _safe_float(p.get("latitude", np.nan), np.nan)
        p_lon = _safe_float(p.get("longitude", np.nan), np.nan)
        c_lat = _safe_float(c.get("latitude", np.nan), np.nan)
        c_lon = _safe_float(c.get("longitude", np.nan), np.nan)
        if np.isnan(p_lat) or np.isnan(p_lon) or np.isnan(c_lat) or np.isnan(c_lon):
            travel.append(0.0)
        else:
            travel.append(haversine_distance(p_lat, p_lon, c_lat, c_lon))

    df["travel_from_prev_km"] = travel
    return df


# -----------------------------
# Day planning (balanced, with buffers)
# -----------------------------

def _split_into_days_balanced(
    routed_df: pd.DataFrame,
    available_days: int,
    day_hours: float,
    speed_kmph: float,
    buffer_per_attraction_hours: float,
    fixed_daily_buffer_hours: float,
) -> List[Dict[str, Any]]:
    """
    Balanced assignment:
    - Each day has a fixed buffer (meals/check-in/rest).
    - Each attraction also has a small buffer (queue/time loss).
    - Prevents over-packed days.
    """
    days = max(1, int(available_days))
    out: List[Dict[str, Any]] = []

    # initialize day containers
    for d in range(days):
        out.append({
            "day": d + 1,
            "items": [],
            "time_used_hours": 0.0,
            "visit_hours": 0.0,
            "travel_hours": 0.0,
            "buffer_hours": float(fixed_daily_buffer_hours),
        })

    day_idx = 0

    for _, row in routed_df.iterrows():
        visit_h = _safe_float(row.get("avg_duration_hours", 3.0), 3.0)
        travel_km = _safe_float(row.get("travel_from_prev_km", 0.0), 0.0)
        travel_h = travel_km / max(speed_kmph, 1e-6)

        item_buffer = float(buffer_per_attraction_hours)
        item_total = visit_h + travel_h + item_buffer

        # if it doesn't fit and we still have days, move day
        if day_idx < days - 1:
            projected = out[day_idx]["time_used_hours"] + item_total + out[day_idx]["buffer_hours"]
            if len(out[day_idx]["items"]) > 0 and projected > day_hours:
                day_idx += 1

        payload = row.to_dict()
        payload["estimated_travel_time_hours"] = travel_h
        payload["estimated_visit_time_hours"] = visit_h
        payload["estimated_buffer_time_hours"] = item_buffer
        payload["estimated_item_time_hours"] = visit_h + travel_h + item_buffer

        out[day_idx]["items"].append(payload)
        out[day_idx]["time_used_hours"] += (visit_h + travel_h + item_buffer)
        out[day_idx]["visit_hours"] += visit_h
        out[day_idx]["travel_hours"] += travel_h

    # finalize totals including fixed buffer
    for d in out:
        d["time_used_hours_with_fixed_buffer"] = float(d["time_used_hours"] + d["buffer_hours"])

    return out


# -----------------------------
# Hotel scoring (never empty)
# -----------------------------

def _hotel_nightly_rate(h: pd.Series) -> float:
    return _safe_float(h.get("nightly_rate", h.get("price_per_night", h.get("price_range_min", 10000.0))), 10000.0)


def score_hotels_perfect(
    user: Dict[str, Any],
    hotels_df: pd.DataFrame,
    center_lat: Optional[float],
    center_lon: Optional[float],
    nightly_max: float,
    max_dist_km: float,
) -> pd.DataFrame:
    df = hotels_df.copy()

    # compute distances
    dists = []
    for _, h in df.iterrows():
        lat = _safe_float(h.get("latitude", np.nan), np.nan)
        lon = _safe_float(h.get("longitude", np.nan), np.nan)
        if center_lat is None or center_lon is None or np.isnan(center_lat) or np.isnan(center_lon) or np.isnan(lat) or np.isnan(lon):
            dists.append(np.nan)
        else:
            dists.append(haversine_distance(center_lat, center_lon, lat, lon))
    df["distance_km"] = dists

    # rating + budget fit + distance fit
    scores = []
    for _, h in df.iterrows():
        rating = _safe_float(h.get("rating", 4.0), 4.0)
        rate = _hotel_nightly_rate(h)
        dist = _safe_float(h.get("distance_km", np.nan), np.nan)

        s = 0.0
        # rating
        s += 0.35 * np.clip((rating - 3.0) / 2.0, 0.0, 1.0)

        # budget fit
        if rate <= nightly_max:
            s += 0.45
        elif rate <= nightly_max * 1.15:
            s += 0.22
        else:
            s -= 0.25

        # distance fit
        if np.isnan(dist):
            s -= 0.05
        else:
            if dist <= 2:
                s += 0.30
            elif dist <= 5:
                s += 0.18
            elif dist <= max_dist_km:
                s += 0.05
            else:
                s -= 0.50

        scores.append(s)

    df["score"] = scores

    # primary filtered candidates
    primary = df.copy()
    if "distance_km" in primary.columns:
        primary = primary[(primary["distance_km"].isna()) | (primary["distance_km"] <= max_dist_km)].copy()

    primary = primary.sort_values(by="score", ascending=False)
    return primary


def _hotel_fallback_strategy(
    hotels_df: pd.DataFrame,
    max_hotels: int,
) -> pd.DataFrame:
    # last resort: show best rated hotels
    df = hotels_df.copy()
    if "rating" in df.columns:
        df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
    df = df.sort_values(by=["rating"], ascending=False)
    return df.head(max_hotels)


def find_hotel_near_point(
    hotels_df: pd.DataFrame,
    target_lat: float,
    target_lon: float,
    nightly_max: float,
    max_dist_km: float = 12.0,
    top_n: int = 1,
):
    df = hotels_df.copy()
    dists = []

    for _, h in df.iterrows():
        lat = _safe_float(h.get("latitude", np.nan), np.nan)
        lon = _safe_float(h.get("longitude", np.nan), np.nan)

        if np.isnan(lat) or np.isnan(lon):
            dists.append(np.inf)
        else:
            dists.append(haversine_distance(target_lat, target_lon, lat, lon))

    df["distance_km"] = dists

    # Estimate nightly price
    def nightly_price(h):
        return _safe_float(
            h.get("nightly_rate",
                  h.get("price_range_min", 10000.0)),
            10000.0
        )

    df["nightly_price"] = df.apply(nightly_price, axis=1)

    # Hard filters
    df = df[
        (df["distance_km"] <= max_dist_km) &
        (df["nightly_price"] <= nightly_max * 1.15)
    ].copy()

    if len(df) == 0:
        return []

    # Score
    df["hotel_score"] = (
        0.6 * df["rating"].fillna(4.0) / 5.0 +
        0.4 * (1.0 - df["distance_km"] / max_dist_km)
    )

    df = df.sort_values(by="hotel_score", ascending=False)
    return df.head(top_n).to_dict(orient="records")



# -----------------------------
# Main
# -----------------------------

def main():
    with open(INPUT_JSON_PATH, "r", encoding="utf-8") as f:
        input_data = json.load(f)

    # accept both formats
    user = input_data.get("user_preferences", input_data)
    context = input_data.get("context", {})

    attractions_df, hotels_df = load_catalogs()

    model = ItineraryModel()
    model.load(MODELS_DIR)

    tb = model.predict_time_and_budget(user)

    # Score attractions using your model
    scored = model.score_attractions_for_user(user, attractions_df)

    # add distance from start if possible
    start_lat, start_lon = _get_user_start(user)
    if start_lat is not None and start_lon is not None:
        dists = []
        for _, r in scored.iterrows():
            lat = _safe_float(r.get("latitude", np.nan), np.nan)
            lon = _safe_float(r.get("longitude", np.nan), np.nan)
            if np.isnan(lat) or np.isnan(lon):
                dists.append(np.nan)
            else:
                dists.append(haversine_distance(start_lat, start_lon, lat, lon))
        scored["distance_km"] = dists
    else:
        scored["distance_km"] = pd.to_numeric(scored.get("distance_km", np.nan), errors="coerce")

    # Contextual adjust
    base_scores_from_model = pd.to_numeric(scored.get("score", 0.0), errors="coerce").fillna(0.0).values
    adjusted = apply_contextual_adjustments(scored, base_scores_from_model, context)
    scored["score_contextual"] = adjusted

    # HARD DISTANCE BOUNDARY


    distance_pref = float(user.get("distance_preference", 80.0))
    distance_tolerance = 1.1  # allow 10% flexibility

    if "distance_km" in scored.columns:
        max_allowed_km = distance_pref * distance_tolerance

        scored = scored[
            scored["distance_km"].notna() &
            (scored["distance_km"] <= max_allowed_km)
            ].copy()


    # CITY-LOCK HEURISTIC (stay near start if enough attractions exist)


    available_days = int(user.get("available_days", 3))
    near_city_radius_km = 15.0

    near_start = scored[
        scored["distance_km"].notna() &
        (scored["distance_km"] <= near_city_radius_km)
        ]

    # If we can comfortably fill the trip near the start city, lock it
    if len(near_start) >= max(available_days * 2, 4):
        scored = near_start.copy()

    # If fusion output is nearly constant, build a stronger rank score from score_base
    fusion_is_constant = _is_almost_constant(scored["score"].values, tol=1e-4)
    scored = _build_final_rank_score(scored, user, context)
    # choose final rank score:
    # - if fusion constant: use rank_score
    # - else: blend fusion contextual + rank_score for extra stability
    if fusion_is_constant:
        scored["final_score"] = scored["rank_score"]
    else:
        sc = pd.to_numeric(scored["score_contextual"], errors="coerce").fillna(0.0).values
        rs = pd.to_numeric(scored["rank_score"], errors="coerce").fillna(0.0).values
        scored["final_score"] = np.clip(0.65 * sc + 0.35 * rs, 0.0, 1.0)

    # Sort by final score
    scored = scored.sort_values(by="final_score", ascending=False).reset_index(drop=True)

    # Preferences / constraints
    available_days = max(1, _safe_int(user.get("available_days", 3), 3))

    # Trip mode: relaxed / normal / packed
    trip_mode = str(user.get("trip_mode", "normal")).lower().strip()
    if trip_mode not in {"relaxed", "normal", "packed"}:
        trip_mode = "normal"

    # day hours by mode
    if trip_mode == "relaxed":
        day_hours = float(np.clip(_safe_float(user.get("day_hours", 7.5), 7.5), 6.0, 10.0))
        max_per_day = _safe_int(user.get("max_attractions_per_day", 2), 2)
        buffer_per_attraction = float(_safe_float(user.get("buffer_per_attraction_hours", 0.35), 0.35))
        fixed_daily_buffer = float(_safe_float(user.get("fixed_daily_buffer_hours", 1.5), 1.5))
    elif trip_mode == "packed":
        day_hours = float(np.clip(_safe_float(user.get("day_hours", 9.5), 9.5), 7.0, 12.0))
        max_per_day = _safe_int(user.get("max_attractions_per_day", 4), 4)
        buffer_per_attraction = float(_safe_float(user.get("buffer_per_attraction_hours", 0.25), 0.25))
        fixed_daily_buffer = float(_safe_float(user.get("fixed_daily_buffer_hours", 1.0), 1.0))
    else:
        day_hours = float(np.clip(_safe_float(user.get("day_hours", 8.5), 8.5), 6.0, 12.0))
        max_per_day = _safe_int(user.get("max_attractions_per_day", 3), 3)
        buffer_per_attraction = float(_safe_float(user.get("buffer_per_attraction_hours", 0.30), 0.30))
        fixed_daily_buffer = float(_safe_float(user.get("fixed_daily_buffer_hours", 1.25), 1.25))

    max_attractions = _safe_int(user.get("max_attractions", max_per_day * available_days), max_per_day * available_days)
    max_total_by_days = max_per_day * available_days
    max_attractions = min(max_attractions, max_total_by_days)

    min_score = float(np.clip(_safe_float(user.get("min_attraction_score", 0.2), 0.2), 0.0, 0.95))

    total_budget = _safe_float(user.get("budget", tb.get("estimated_total_budget", 150000.0)), tb.get("estimated_total_budget", 150000.0))

    lodging_ratio = float(np.clip(_safe_float(user.get("lodging_budget_ratio", 0.45), 0.45), 0.2, 0.8))
    transport_ratio = float(np.clip(_safe_float(user.get("transport_budget_ratio", 0.15), 0.15), 0.05, 0.35))
    activity_ratio = max(0.05, 1.0 - (lodging_ratio + transport_ratio))

    lodging_budget_total = total_budget * lodging_ratio
    transport_budget_total = total_budget * transport_ratio
    activity_budget_total = total_budget * activity_ratio

    nightly_max = lodging_budget_total / max(available_days, 1)

    max_hotel_distance_km = float(
        np.clip(
            user.get("max_hotel_distance_km", 15.0),
            5.0,
            40.0
        )
    )

    # Geographic cluster radius
    cluster_radius = float(np.clip(_safe_float(user.get("cluster_radius_km", user.get("distance_preference", 80.0)), 80.0), 20.0, 220.0))

    # Travel estimation
    speed_kmph = _estimate_speed_kmph(context)
    transport_cost_per_km = _estimate_transport_cost_per_km_lkr(user)

    # 1) Keep only reasonable scored candidates
    candidates = scored[scored["final_score"] >= min_score].copy()
    if len(candidates) == 0:
        candidates = scored.head(max(30, max_attractions * 6)).copy()

    # 2) Cluster lock around best attraction
    clustered = _pick_geographic_cluster(candidates, anchor_idx=0, radius_km=cluster_radius)
    if len(clustered) < max(6, max_attractions):
        clustered = _pick_geographic_cluster(candidates, anchor_idx=0, radius_km=min(300.0, cluster_radius * 1.8))

    # 3) Route order (greedy NN) using top pool
    pool = clustered.sort_values(by="final_score", ascending=False).head(max(40, max_attractions * 6))
    routed = _route_nearest_neighbor(pool, start_lat, start_lon)

    # 4) Select with realistic constraints:
    # time budget includes buffers; transport+activity budgets enforced
    selected_rows: List[Dict[str, Any]] = []
    travel_km_acc = 0.0
    visit_h_acc = 0.0
    buffer_h_acc = 0.0
    travel_h_acc = 0.0
    activity_cost_acc = 0.0

    # total usable time across trip (excluding fixed daily buffer)
    trip_time_budget = available_days * max(0.0, day_hours - fixed_daily_buffer)

    for _, row in routed.iterrows():
        if len(selected_rows) >= max_attractions:
            break

        visit_h = _safe_float(row.get("avg_duration_hours", 3.0), 3.0)
        travel_km = _safe_float(row.get("travel_from_prev_km", 0.0), 0.0)
        travel_h = travel_km / max(speed_kmph, 1e-6)

        # time loss per attraction (queue, walking, parking)
        item_buffer = buffer_per_attraction

        # cost
        est_cost = _safe_float(row.get("avg_cost", 0.0), 0.0)
        if est_cost <= 0:
            est_cost = float(np.clip(_safe_float(user.get("default_attraction_cost_lkr", 2500.0), 2500.0), 500.0, 25000.0))

        # proposed totals
        next_travel_km = travel_km_acc + travel_km
        next_travel_cost = next_travel_km * transport_cost_per_km

        next_time = (visit_h_acc + travel_h_acc + buffer_h_acc) + (visit_h + travel_h + item_buffer)
        next_activity_cost = activity_cost_acc + est_cost

        # budgets
        if next_travel_cost > transport_budget_total * 1.10:
            continue
        if next_activity_cost > activity_budget_total * 1.15:
            continue
        if len(selected_rows) > 0 and next_time > trip_time_budget * 1.05:
            continue

        payload = row.to_dict()
        payload["estimated_travel_time_hours"] = travel_h
        payload["estimated_visit_time_hours"] = visit_h
        payload["estimated_buffer_time_hours"] = item_buffer
        payload["estimated_item_time_hours"] = visit_h + travel_h + item_buffer
        payload["estimated_transport_cost_lkr"] = travel_km * transport_cost_per_km

        selected_rows.append(payload)
        travel_km_acc = next_travel_km
        travel_h_acc += travel_h
        visit_h_acc += visit_h
        buffer_h_acc += item_buffer
        activity_cost_acc = next_activity_cost

    # Ensure at least 1 attraction
    if len(selected_rows) == 0 and len(routed) > 0:
        r0 = routed.iloc[0].to_dict()
        r0["estimated_travel_time_hours"] = 0.0
        r0["estimated_visit_time_hours"] = _safe_float(r0.get("avg_duration_hours", 3.0), 3.0)
        r0["estimated_buffer_time_hours"] = buffer_per_attraction
        r0["estimated_item_time_hours"] = r0["estimated_visit_time_hours"] + r0["estimated_buffer_time_hours"]
        r0["estimated_transport_cost_lkr"] = 0.0
        selected_rows.append(r0)
        travel_km_acc = 0.0
        travel_h_acc = 0.0
        visit_h_acc = r0["estimated_visit_time_hours"]
        buffer_h_acc = r0["estimated_buffer_time_hours"]
        activity_cost_acc = _safe_float(r0.get("avg_cost", 2500.0), 2500.0)

    selected_df = pd.DataFrame(selected_rows)

    # 5) Day plan (balanced with buffers)
    if len(selected_df) > 0:
        day_plan = _split_into_days_balanced(
            selected_df,
            available_days=available_days,
            day_hours=day_hours,
            speed_kmph=speed_kmph,
            buffer_per_attraction_hours=buffer_per_attraction,
            fixed_daily_buffer_hours=fixed_daily_buffer,
        )
    else:
        day_plan = [{"day": i + 1, "items": [], "time_used_hours": 0.0, "visit_hours": 0.0, "travel_hours": 0.0, "buffer_hours": fixed_daily_buffer, "time_used_hours_with_fixed_buffer": fixed_daily_buffer} for i in range(available_days)]


    # Assign best hotel per day (near last attraction)


    for day in day_plan:
        # Empty day → no hotel needed
        if len(day.get("items", [])) == 0:
            day["recommended_hotel"] = None
            day["note"] = "Free day / optional activities nearby"
            continue

        last_item = day["items"][-1]
        lat = _safe_float(last_item.get("latitude", np.nan), np.nan)
        lon = _safe_float(last_item.get("longitude", np.nan), np.nan)

        if np.isnan(lat) or np.isnan(lon):
            day["recommended_hotel"] = None
            continue

        hotels_near_day = find_hotel_near_point(
            hotels_df=hotels_df,
            target_lat=lat,
            target_lon=lon,
            nightly_max=nightly_max,
            max_dist_km=max_hotel_distance_km,
            top_n=1,
        )

        day["recommended_hotel"] = hotels_near_day[0] if hotels_near_day else None

    # 6) Compute itinerary center (for base hotel)
    if len(selected_df) > 0 and "latitude" in selected_df.columns:
        center_lat = _safe_float(pd.to_numeric(selected_df["latitude"], errors="coerce").mean(), np.nan)
        center_lon = _safe_float(pd.to_numeric(selected_df["longitude"], errors="coerce").mean(), np.nan)
        if np.isnan(center_lat) or np.isnan(center_lon):
            center_lat, center_lon = _get_user_start(user)
    else:
        center_lat, center_lon = _get_user_start(user)

    # 7) Hotel recommendation (never empty)
    max_hotels = _safe_int(user.get("max_hotels", 5), 5)

    nightly_max = lodging_budget_total / max(available_days, 1)
    # hotel distance preference: strict first, then relax
    max_hotel_distance_km = float(np.clip(_safe_float(user.get("max_hotel_distance_km", 15.0), 15.0), 5.0, 60.0))

    primary = score_hotels_perfect(
        user=user,
        hotels_df=hotels_df,
        center_lat=center_lat,
        center_lon=center_lon,
        nightly_max=nightly_max,
        max_dist_km=max_hotel_distance_km,
    )

    top_hotels = primary.head(max_hotels)

    # fallback 1: relax distance
    if len(top_hotels) == 0:
        relaxed = score_hotels_perfect(
            user=user,
            hotels_df=hotels_df,
            center_lat=center_lat,
            center_lon=center_lon,
            nightly_max=nightly_max,
            max_dist_km=max(30.0, max_hotel_distance_km * 2),
        )
        top_hotels = relaxed.head(max_hotels)

    # fallback 2: relax nightly budget (but still prefer near)
    if len(top_hotels) == 0:
        relaxed_budget = score_hotels_perfect(
            user=user,
            hotels_df=hotels_df,
            center_lat=center_lat,
            center_lon=center_lon,
            nightly_max=nightly_max * 1.6,
            max_dist_km=max(30.0, max_hotel_distance_km * 2),
        )
        top_hotels = relaxed_budget.head(max_hotels)

    # fallback 3: best rated overall (never empty)
    if len(top_hotels) == 0:
        top_hotels = _hotel_fallback_strategy(hotels_df, max_hotels)

    # Totals
    total_transport_cost = travel_km_acc * transport_cost_per_km
    time_used_core = visit_h_acc + travel_h_acc + buffer_h_acc
    time_used_with_fixed = time_used_core + (available_days * fixed_daily_buffer)

    result = {
        # compatibility fields
        "estimated_total_time_hours": float(time_used_with_fixed),
        "estimated_total_budget": float(total_budget),
        "selected_attractions": selected_df.to_dict(orient="records"),
        "recommended_hotels": top_hotels.to_dict(orient="records"),

        # upgraded fields
        "trip_mode": trip_mode,
        "fusion_score_constant_detected": bool(fusion_is_constant),

        "model_predicted_time_hours": float(tb.get("estimated_total_time_hours", 0.0)),
        "model_predicted_budget_lkr": float(tb.get("estimated_total_budget", 0.0)),

        "constraints": {
            "available_days": int(available_days),
            "day_hours": float(day_hours),
            "max_attractions_per_day": int(max_per_day),
            "max_attractions_total": int(max_attractions),
            "cluster_radius_km": float(cluster_radius),
            "speed_kmph_used": float(speed_kmph),
            "buffer_per_attraction_hours": float(buffer_per_attraction),
            "fixed_daily_buffer_hours": float(fixed_daily_buffer),
            "budget_total_lkr": float(total_budget),
            "budget_split": {
                "lodging_ratio": float(lodging_ratio),
                "transport_ratio": float(transport_ratio),
                "activity_ratio": float(activity_ratio),
                "lodging_budget_lkr": float(lodging_budget_total),
                "transport_budget_lkr": float(transport_budget_total),
                "activity_budget_lkr": float(activity_budget_total),
                "nightly_max_lkr": float(nightly_max),
            },
        },

        "travel_summary": {
            "total_travel_km": float(travel_km_acc),
            "total_travel_time_hours": float(travel_h_acc),
            "estimated_transport_cost_lkr": float(total_transport_cost),
        },

        "activity_summary": {
            "estimated_activity_cost_lkr": float(activity_cost_acc),
            "estimated_visit_hours": float(visit_h_acc),
            "estimated_buffer_hours": float(buffer_h_acc),
            "estimated_total_time_core_hours": float(time_used_core),
            "estimated_total_time_with_fixed_buffers_hours": float(time_used_with_fixed),
        },

        "itinerary_days": day_plan,
        "itinerary_center": {
            "latitude": None if center_lat is None or (isinstance(center_lat, float) and np.isnan(center_lat)) else float(center_lat),
            "longitude": None if center_lon is None or (isinstance(center_lon, float) and np.isnan(center_lon)) else float(center_lon),
        },


    }

    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
