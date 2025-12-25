import os
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple
import ast
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_absolute_error,
    r2_score,
    roc_auc_score,
)
import xgboost as xgb
from tensorflow import keras
from tensorflow.keras import layers



# Utilities


def haversine_distance(lat1, lon1, lat2, lon2):

    R = 6371.0
    lat1 = np.radians(lat1)
    lon1 = np.radians(lon1)
    lat2 = np.radians(lat2)
    lon2 = np.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    c = 2 * np.arcsin(np.sqrt(a))
    return R * c


def parse_selected_list(s):

    if s is None:
        return []

    # Handle NaN
    if isinstance(s, float) and np.isnan(s):
        return []

    # If it's already a list (just in case)
    if isinstance(s, list):
        return [str(x).strip() for x in s]

    text = str(s).strip()
    if not text:
        return []


    if text.startswith("[") and text.endswith("]"):
        try:
            parsed = ast.literal_eval(text)

            return [str(x).strip() for x in parsed]
        except Exception:

            pass

    return [x.strip() for x in text.split(",") if x.strip()]



# Main Itinerary Model


@dataclass
class ItineraryModel:
    time_model: Any = None
    budget_model: Any = None
    attraction_model: Any = None
    fusion_model: Any = None

    base_feature_cols: List[str] = None
    categorical_cols: List[str] = None
    numeric_cols: List[str] = None

    # caches for plotting / diagnostics
    last_time_eval: Dict[str, np.ndarray] = None
    last_budget_eval: Dict[str, np.ndarray] = None
    last_attraction_eval: Dict[str, np.ndarray] = None
    last_fusion_eval: Dict[str, np.ndarray] = None

    def __post_init__(self):
        # Itinerary-level features (from itinerary_training_data.csv)
        if self.base_feature_cols is None:
            self.base_feature_cols = [
                "budget",
                "available_days",
                "num_travelers",
                "distance_preference",
                "activity_type",
                "season",
            ]
        if self.categorical_cols is None:
            self.categorical_cols = ["activity_type", "season"]
        if self.numeric_cols is None:
            self.numeric_cols = [
                "budget",
                "available_days",
                "num_travelers",
                "distance_preference",
            ]

    #  TIME & BUDGET

    def _build_preprocessor(self):

        cat_transformer = OneHotEncoder(handle_unknown="ignore")
        preprocessor = ColumnTransformer(
            transformers=[
                ("cat", cat_transformer, self.categorical_cols),
                ("num", "passthrough", self.numeric_cols),
            ]
        )
        return preprocessor

    def train_time_budget_models(self, df: pd.DataFrame) -> Dict[str, float]:

        df = df.copy()

        df = df.dropna(subset=["total_time_hours", "total_budget"])

        X = df[self.base_feature_cols]
        y_time = df["total_time_hours"].values
        y_budget = df["total_budget"].values

        X_train, X_val, y_time_train, y_time_val, y_budget_train, y_budget_val = train_test_split(
            X, y_time, y_budget, test_size=0.2, random_state=42
        )

        preprocessor = self._build_preprocessor()

        time_reg = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="reg:squarederror",
            random_state=42,
        )

        budget_reg = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="reg:squarederror",
            random_state=42,
        )

        self.time_model = Pipeline(
            steps=[("preprocess", preprocessor), ("model", time_reg)]
        )
        self.budget_model = Pipeline(
            steps=[("preprocess", preprocessor), ("model", budget_reg)]
        )

        self.time_model.fit(X_train, y_time_train)
        self.budget_model.fit(X_train, y_budget_train)

        # Evaluate
        y_time_pred = self.time_model.predict(X_val)
        y_budget_pred = self.budget_model.predict(X_val)

        metrics = {
            "time_mae": mean_absolute_error(y_time_val, y_time_pred),
            "time_r2": r2_score(y_time_val, y_time_pred),
            "budget_mae": mean_absolute_error(y_budget_val, y_budget_pred),
            "budget_r2": r2_score(y_budget_val, y_budget_pred),
        }

        # cache for plotting
        self.last_time_eval = {
            "y_true": y_time_val,
            "y_pred": y_time_pred,
        }
        self.last_budget_eval = {
            "y_true": y_budget_val,
            "y_pred": y_budget_pred,
        }

        return metrics

    # ATTRACTION RANKING + FUSION

    def _build_attraction_training_pairs(
        self,
        itinerary_df: pd.DataFrame,
        attractions_df: pd.DataFrame,
        attraction_id_col: str = "attraction_id",
        negative_per_positive: int = 5,
        random_state: int = 42,
    ) -> Tuple[pd.DataFrame, np.ndarray]:

        rng = np.random.RandomState(random_state)
        rows = []
        labels = []

        if attraction_id_col not in attractions_df.columns:
            attraction_id_col = "attraction_id" if "attraction_id" in attractions_df.columns else "name"

        all_ids = attractions_df[attraction_id_col].astype(str).tolist()

        for _, it in itinerary_df.iterrows():
            selected_set = set(parse_selected_list(it.get("selected_attractions", "")))
            if not selected_set:
                continue

            # positive attractions for this itinerary
            pos_mask = attractions_df[attraction_id_col].astype(str).isin(selected_set)
            pos_attractions = attractions_df[pos_mask]
            neg_attractions = attractions_df[~pos_mask]

            if len(pos_attractions) == 0 or len(neg_attractions) == 0:
                continue

            neg_ids_list = neg_attractions[attraction_id_col].astype(str).tolist()

            for _, pos_att in pos_attractions.iterrows():
                pos_id = str(pos_att[attraction_id_col])

                # positive sample
                rows.append(self._build_single_pair_row(it, pos_att))
                labels.append(1)

                # negative samples
                if len(neg_ids_list) <= negative_per_positive:
                    sampled_neg = neg_attractions
                else:
                    sampled_ids = rng.choice(neg_ids_list, size=negative_per_positive, replace=False)
                    sampled_neg = neg_attractions[
                        neg_attractions[attraction_id_col].astype(str).isin(sampled_ids)
                    ]

                for _, neg_att in sampled_neg.iterrows():
                    rows.append(self._build_single_pair_row(it, neg_att))
                    labels.append(0)

        train_df = pd.DataFrame(rows)
        labels = np.array(labels, dtype=int)
        return train_df, labels

    def _build_single_pair_row(self, it: pd.Series, att: pd.Series) -> Dict[str, Any]:

        base = {
            "budget": it.get("budget", 0.0),
            "available_days": it.get("available_days", 1.0),
            "num_travelers": it.get("num_travelers", 1.0),
            "distance_preference": it.get("distance_preference", 50.0),
            "activity_type": it.get("activity_type", "general"),
            "season": it.get("season", "any"),
        }

        base["attraction_id"] = str(att.get("attraction_id", att.get("name", "")))
        base["attraction_category"] = att.get("category", "general")
        base["attraction_avg_cost"] = att.get("avg_cost", 0.0)
        base["attraction_avg_duration"] = att.get("avg_duration_hours", 2.0)
        base["attraction_outdoor"] = 1.0 if bool(att.get("outdoor", True)) else 0.0
        base["attraction_popularity_score"] = att.get("popularity_score", 0.0)
        base["attraction_best_season"] = att.get("best_season", "any")
        base["attraction_accessibility"] = att.get("accessibility", "medium")
        base["attraction_tourist_density"] = att.get("tourist_density", 0.0)
        base["attraction_safety_rating"] = att.get("safety_rating", 3.0)

        start_lat = it.get("start_latitude", np.nan)
        start_lon = it.get("start_longitude", np.nan)
        lat = att.get("latitude", np.nan)
        lon = att.get("longitude", np.nan)

        if not np.isnan(start_lat) and not np.isnan(start_lon) and not np.isnan(lat) and not np.isnan(lon):
            base["distance_km"] = haversine_distance(start_lat, start_lon, lat, lon)
        else:
            base["distance_km"] = np.nan

        return base

    def _build_fusion_model(self, input_dim: int):
        inputs = layers.Input(shape=(input_dim,), name="fusion_features")

        x = layers.Dense(8, activation="relu")(inputs)
        x = layers.Dropout(0.2)(x)
        x = layers.Dense(4, activation="relu")(x)

        output = layers.Dense(1, activation="sigmoid", name="final_score")(x)

        model = keras.Model(inputs=inputs, outputs=output, name="itinerary_fusion_model")

        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss="binary_crossentropy",
            metrics=["accuracy", keras.metrics.AUC(name="auc")],
        )
        self.fusion_model = model

    def train_attraction_model(
        self,
        itinerary_df: pd.DataFrame,
        attractions_df: pd.DataFrame,
        negative_per_positive: int = 5,
    ) -> Dict[str, float]:

        pairs_df, labels = self._build_attraction_training_pairs(
            itinerary_df,
            attractions_df,
            attraction_id_col="attraction_id",
            negative_per_positive=negative_per_positive,
            random_state=42,
        )

        if len(pairs_df) == 0:
            raise ValueError("No training pairs generated. Check selected_attractions and attraction_id mapping.")

        numeric_cols = [
            "budget",
            "available_days",
            "num_travelers",
            "distance_preference",
            "attraction_avg_cost",
            "attraction_avg_duration",
            "attraction_outdoor",
            "attraction_popularity_score",
            "attraction_tourist_density",
            "attraction_safety_rating",
            "distance_km",
        ]
        cat_cols = [
            "activity_type",
            "season",
            "attraction_category",
            "attraction_best_season",
            "attraction_accessibility",
        ]

        pairs_df[numeric_cols] = pairs_df[numeric_cols].fillna(pairs_df[numeric_cols].median())

        preprocessor = ColumnTransformer(
            transformers=[
                ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
                ("num", "passthrough", numeric_cols),
            ]
        )

        clf = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="binary:logistic",
            eval_metric="auc",
            random_state=42,
        )

        X_train, X_val, y_train, y_val = train_test_split(
            pairs_df, labels, test_size=0.2, random_state=42, stratify=labels
        )

        self.attraction_model = Pipeline(
            steps=[("preprocess", preprocessor), ("model", clf)]
        )

        self.attraction_model.fit(X_train, y_train)

        # Base learner evaluation
        y_val_proba_base = self.attraction_model.predict_proba(X_val)[:, 1]
        base_auc = roc_auc_score(y_val, y_val_proba_base)

        # Build fusion training features
        y_train_proba_base = self.attraction_model.predict_proba(X_train)[:, 1]

        def build_fusion_features(df_pairs: pd.DataFrame, base_proba: np.ndarray) -> np.ndarray:
            budget = df_pairs["budget"].values
            days = np.maximum(df_pairs["available_days"].values, 1.0)
            dist_pref = np.maximum(df_pairs["distance_preference"].values, 1.0)
            avg_cost = df_pairs["attraction_avg_cost"].values
            avg_dur = df_pairs["attraction_avg_duration"].values
            dist_km = df_pairs["distance_km"].fillna(df_pairs["distance_km"].median()).values

            daily_budget = budget / days
            cost_ratio = avg_cost / np.maximum(daily_budget, 1.0)

            max_hours = days * 8.0
            duration_ratio = avg_dur / np.maximum(max_hours, 1.0)

            distance_ratio = dist_km / dist_pref

            cost_ratio = np.clip(cost_ratio, 0.0, 5.0)
            duration_ratio = np.clip(duration_ratio, 0.0, 5.0)
            distance_ratio = np.clip(distance_ratio, 0.0, 5.0)

            features = np.column_stack(
                [
                    base_proba,
                    cost_ratio,
                    duration_ratio,
                    distance_ratio,
                ]
            )
            return features

        X_fusion_train = build_fusion_features(X_train, y_train_proba_base)
        X_fusion_val = build_fusion_features(X_val, y_val_proba_base)

        self._build_fusion_model(input_dim=X_fusion_train.shape[1])

        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=10, restore_best_weights=True
            )
        ]

        history = self.fusion_model.fit(
            X_fusion_train,
            y_train,
            validation_data=(X_fusion_val, y_val),
            epochs=80,
            batch_size=64,
            callbacks=callbacks,
            verbose=1,
        )

        y_val_proba_fusion = self.fusion_model.predict(X_fusion_val, verbose=0).ravel()
        fusion_auc = roc_auc_score(y_val, y_val_proba_fusion)

        # cache for plotting
        self.last_attraction_eval = {
            "y_val": y_val,
            "y_val_proba_base": y_val_proba_base,
        }
        self.last_fusion_eval = {
            "y_val": y_val,
            "y_val_proba_fusion": y_val_proba_fusion,
            "history": history.history,
        }

        metrics = {
            "attraction_auc_base": float(base_auc),
            "attraction_auc_fusion": float(fusion_auc),
            "positive_rate": float(labels.mean()),
        }

        return metrics

    # PREDICTION

    def predict_time_and_budget(self, user: Dict[str, Any]) -> Dict[str, float]:
        features = {
            "budget": user.get("budget", 100000.0),
            "available_days": user.get("available_days", 3.0),
            "num_travelers": user.get("num_travelers", 2.0),
            "distance_preference": user.get("distance_preference", 100.0),
            "activity_type": user.get("activity_type", "general"),
            "season": user.get("season", "any"),
        }
        X = pd.DataFrame([features])

        time_pred = float(self.time_model.predict(X)[0]) if self.time_model else 0.0
        budget_pred = float(self.budget_model.predict(X)[0]) if self.budget_model else 0.0

        return {
            "estimated_total_time_hours": time_pred,
            "estimated_total_budget": budget_pred,
        }

    def score_attractions_for_user(
        self,
        user: Dict[str, Any],
        attractions_df: pd.DataFrame,
    ) -> pd.DataFrame:

        rows = []

        for _, att in attractions_df.iterrows():
            base = {
                "budget": user.get("budget", 100000.0),
                "available_days": user.get("available_days", 3.0),
                "num_travelers": user.get("num_travelers", 2.0),
                "distance_preference": user.get("distance_preference", 100.0),
                "activity_type": user.get("activity_type", "general"),
                "season": user.get("season", "any"),
                "attraction_id": str(att.get("attraction_id", att.get("name", ""))),
                "attraction_category": att.get("category", "general"),
                "attraction_avg_cost": att.get("avg_cost", 0.0),
                "attraction_avg_duration": att.get("avg_duration_hours", 2.0),
                "attraction_outdoor": 1.0 if bool(att.get("outdoor", True)) else 0.0,
                "attraction_popularity_score": att.get("popularity_score", 0.0),
                "attraction_best_season": att.get("best_season", "any"),
                "attraction_accessibility": att.get("accessibility", "medium"),
                "attraction_tourist_density": att.get("tourist_density", 0.0),
                "attraction_safety_rating": att.get("safety_rating", 3.0),
            }

            start_lat = user.get("start_latitude", np.nan)
            start_lon = user.get("start_longitude", np.nan)
            lat = att.get("latitude", np.nan)
            lon = att.get("longitude", np.nan)

            if not np.isnan(start_lat) and not np.isnan(start_lon) and not np.isnan(lat) and not np.isnan(lon):
                base["distance_km"] = haversine_distance(start_lat, start_lon, lat, lon)
            else:
                base["distance_km"] = np.nan

            rows.append(base)

        pairs_df = pd.DataFrame(rows)

        numeric_cols = [
            "budget",
            "available_days",
            "num_travelers",
            "distance_preference",
            "attraction_avg_cost",
            "attraction_avg_duration",
            "attraction_outdoor",
            "attraction_popularity_score",
            "attraction_tourist_density",
            "attraction_safety_rating",
            "distance_km",
        ]
        pairs_df[numeric_cols] = pairs_df[numeric_cols].fillna(pairs_df[numeric_cols].median())

        base_proba = self.attraction_model.predict_proba(pairs_df)[:, 1]

        budget = pairs_df["budget"].values
        days = np.maximum(pairs_df["available_days"].values, 1.0)
        dist_pref = np.maximum(pairs_df["distance_preference"].values, 1.0)
        avg_cost = pairs_df["attraction_avg_cost"].values
        avg_dur = pairs_df["attraction_avg_duration"].values
        dist_km = pairs_df["distance_km"].values

        daily_budget = budget / days
        cost_ratio = avg_cost / np.maximum(daily_budget, 1.0)
        max_hours = days * 8.0
        duration_ratio = avg_dur / np.maximum(max_hours, 1.0)
        distance_ratio = dist_km / dist_pref

        cost_ratio = np.clip(cost_ratio, 0.0, 5.0)
        duration_ratio = np.clip(duration_ratio, 0.0, 5.0)
        distance_ratio = np.clip(distance_ratio, 0.0, 5.0)

        X_fusion = np.column_stack(
            [base_proba, cost_ratio, duration_ratio, distance_ratio]
        )

        final_proba = self.fusion_model.predict(X_fusion, verbose=0).ravel()

        result = attractions_df.copy()
        result["score_base"] = base_proba
        result["score"] = final_proba
        return result

    # SAVE / LOAD

    def save(self, models_dir: str):
        os.makedirs(models_dir, exist_ok=True)
        joblib.dump(self.time_model, os.path.join(models_dir, "time_model.pkl"))
        joblib.dump(self.budget_model, os.path.join(models_dir, "budget_model.pkl"))
        joblib.dump(self.attraction_model, os.path.join(models_dir, "attraction_model.pkl"))
        if self.fusion_model is not None:
            self.fusion_model.save(os.path.join(models_dir, "fusion_model.h5"))

    def load(self, models_dir: str):
        self.time_model = joblib.load(os.path.join(models_dir, "time_model.pkl"))
        self.budget_model = joblib.load(os.path.join(models_dir, "budget_model.pkl"))
        self.attraction_model = joblib.load(os.path.join(models_dir, "attraction_model.pkl"))
        fusion_path = os.path.join(models_dir, "fusion_model.h5")
        if os.path.exists(fusion_path):
            self.fusion_model = keras.models.load_model(fusion_path)
        else:
            self.fusion_model = None
