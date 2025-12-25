import numpy as np
import pandas as pd
import joblib
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder

import xgboost as xgb
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.utils import to_categorical


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["hour_of_day"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    return df


@dataclass
class RiskStackingModel:
    weather_model: Any = None
    traffic_model: Any = None
    incident_model: Any = None
    fusion_model: Any = None
    label_encoder: Any = None
    feature_cols_weather: List[str] = None
    feature_cols_traffic: List[str] = None
    feature_cols_incident: List[str] = None

    def __post_init__(self):
        if self.feature_cols_weather is None:
            self.feature_cols_weather = [
                "temperature",
                "rainfall_mm",
                "wind_speed",
                "humidity",
                "visibility_km",
            ]
        if self.feature_cols_traffic is None:
            self.feature_cols_traffic = [
                "traffic_congestion_level",
                "average_speed",
                "traffic_volume",
            ]
        if self.feature_cols_incident is None:
            self.feature_cols_incident = [
                "num_recent_accidents",
                "num_recent_incidents",
            ]

    def _build_fusion_model(self, input_dim: int, num_classes: int):
        inputs = layers.Input(shape=(input_dim,), name="stack_features")

        x = layers.Dense(16, activation="relu")(inputs)
        x = layers.Dropout(0.2)(x)
        x = layers.Dense(8, activation="relu")(x)

        risk_score = layers.Dense(1, activation="sigmoid", name="risk_score")(x)
        risk_category = layers.Dense(num_classes, activation="softmax", name="risk_category")(x)
        severity_level = layers.Dense(1, activation="relu", name="severity_level")(x)

        model = keras.Model(
            inputs=inputs,
            outputs=[risk_score, risk_category, severity_level],
            name="risk_fusion_model",
        )

        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss={
                "risk_score": "mse",
                "risk_category": "sparse_categorical_crossentropy",
                "severity_level": "mse",
            },
            loss_weights={
                "risk_score": 1.0,
                "risk_category": 0.8,
                "severity_level": 0.6,
            },
            metrics={
                "risk_score": ["mae"],
                "risk_category": ["accuracy"],
                "severity_level": ["mae"],
            },
        )

        self.fusion_model = model

    def train(self, df: pd.DataFrame, test_size: float = 0.2, random_state: int = 42):
        df = add_time_features(df)

        feature_cols_base = (
            self.feature_cols_weather
            + self.feature_cols_traffic
            + self.feature_cols_incident
            + ["hour_of_day", "day_of_week"]
        )

        X = df[feature_cols_base]
        y_risk = df["risk_score"].values
        y_cat = df["risk_category"].values
        y_sev = df["severity_level"].values

        X_train, X_val, y_risk_train, y_risk_val, y_cat_train, y_cat_val, y_sev_train, y_sev_val = train_test_split(
            X, y_risk, y_cat, y_sev, test_size=test_size, random_state=random_state
        )

        df_train = df.iloc[X_train.index] if isinstance(X_train, pd.DataFrame) else df.iloc[X_train]
        df_val = df.iloc[X_val.index] if isinstance(X_val, pd.DataFrame) else df.iloc[X_val]

        if isinstance(X_train, pd.DataFrame):
            Xw_train = X_train[self.feature_cols_weather]
            Xt_train = X_train[self.feature_cols_traffic]
            Xi_train = X_train[self.feature_cols_incident]
        else:
            Xw_train = df_train[self.feature_cols_weather]
            Xt_train = df_train[self.feature_cols_traffic]
            Xi_train = df_train[self.feature_cols_incident]

        if isinstance(X_val, pd.DataFrame):
            Xw_val = X_val[self.feature_cols_weather]
            Xt_val = X_val[self.feature_cols_traffic]
            Xi_val = X_val[self.feature_cols_incident]
        else:
            Xw_val = df_val[self.feature_cols_weather]
            Xt_val = df_val[self.feature_cols_traffic]
            Xi_val = df_val[self.feature_cols_incident]

        self.weather_model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="reg:squarederror",
            random_state=random_state,
        )

        self.traffic_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=6,
            random_state=random_state,
            n_jobs=-1,
        )

        self.incident_model = xgb.XGBRegressor(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="reg:squarederror",
            random_state=random_state,
        )

        self.weather_model.fit(Xw_train, y_risk_train)
        self.traffic_model.fit(Xt_train, y_risk_train)
        self.incident_model.fit(Xi_train, y_risk_train)

        weather_risk_train = self.weather_model.predict(Xw_train)
        traffic_risk_train = self.traffic_model.predict(Xt_train)
        incident_risk_train = self.incident_model.predict(Xi_train)

        weather_risk_val = self.weather_model.predict(Xw_val)
        traffic_risk_val = self.traffic_model.predict(Xt_val)
        incident_risk_val = self.incident_model.predict(Xi_val)

        if isinstance(X_train, pd.DataFrame):
            hour_train = X_train["hour_of_day"].values / 23.0
            day_train = X_train["day_of_week"].values / 6.0
        else:
            hour_train = df_train["hour_of_day"].values / 23.0
            day_train = df_train["day_of_week"].values / 6.0

        if isinstance(X_val, pd.DataFrame):
            hour_val = X_val["hour_of_day"].values / 23.0
            day_val = X_val["day_of_week"].values / 6.0
        else:
            hour_val = df_val["hour_of_day"].values / 23.0
            day_val = df_val["day_of_week"].values / 6.0

        X_stack_train = np.column_stack(
            [weather_risk_train, traffic_risk_train, incident_risk_train, hour_train, day_train]
        )
        X_stack_val = np.column_stack(
            [weather_risk_val, traffic_risk_val, incident_risk_val, hour_val, day_val]
        )

        self.label_encoder = LabelEncoder()
        y_cat_int = self.label_encoder.fit_transform(y_cat_train)
        y_cat_val_int = self.label_encoder.transform(y_cat_val)

        num_classes = len(self.label_encoder.classes_)
        self._build_fusion_model(input_dim=X_stack_train.shape[1], num_classes=num_classes)

        callbacks_list = [
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=10, restore_best_weights=True
            )
        ]

        history = self.fusion_model.fit(
            X_stack_train,
            {
                "risk_score": y_risk_train,
                "risk_category": y_cat_int,
                "severity_level": y_sev_train,
            },
            validation_data=(
                X_stack_val,
                {
                    "risk_score": y_risk_val,
                    "risk_category": y_cat_val_int,
                    "severity_level": y_sev_val,
                },
            ),
            epochs=80,
            batch_size=32,
            callbacks=callbacks_list,
            verbose=1,
        )

        base_metrics = {
            "weather_mae": mean_absolute_error(y_risk_val, weather_risk_val),
            "weather_r2": r2_score(y_risk_val, weather_risk_val),
            "traffic_mae": mean_absolute_error(y_risk_val, traffic_risk_val),
            "traffic_r2": r2_score(y_risk_val, traffic_risk_val),
            "incident_mae": mean_absolute_error(y_risk_val, incident_risk_val),
            "incident_r2": r2_score(y_risk_val, incident_risk_val),
        }

        return history, base_metrics

    def _build_stack_features_from_row(self, row: Dict[str, Any]) -> np.ndarray:
        w_features = np.array(
            [[row.get(col, 0.0) for col in self.feature_cols_weather]],
            dtype=float,
        )
        t_features = np.array(
            [[row.get(col, 0.0) for col in self.feature_cols_traffic]],
            dtype=float,
        )
        i_features = np.array(
            [[row.get(col, 0.0) for col in self.feature_cols_incident]],
            dtype=float,
        )

        weather_risk = float(self.weather_model.predict(w_features)[0])
        traffic_risk = float(self.traffic_model.predict(t_features)[0])
        incident_risk = float(self.incident_model.predict(i_features)[0])

        timestamp = pd.to_datetime(row.get("timestamp"))
        hour = timestamp.hour / 23.0
        day = timestamp.dayofweek / 6.0

        X_stack = np.array([[weather_risk, traffic_risk, incident_risk, hour, day]], dtype=float)
        return X_stack

    def predict_for_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        X_stack = self._build_stack_features_from_row(row)
        preds = self.fusion_model.predict(X_stack, verbose=0)

        risk_score_pred = float(preds[0][0][0])
        cat_probs = preds[1][0]
        severity_pred = float(preds[2][0][0])

        cat_idx = int(np.argmax(cat_probs))
        risk_category_pred = self.label_encoder.inverse_transform([cat_idx])[0]

        return {
            "risk_score": risk_score_pred,
            "risk_category": risk_category_pred,
            "severity_level": severity_pred,
            "category_probabilities": {
                cls: float(cat_probs[i]) for i, cls in enumerate(self.label_encoder.classes_)
            },
        }

    def save_models(self, path_prefix: str):
        if self.weather_model is None or self.fusion_model is None:
            raise ValueError("Models are not trained yet.")

        joblib.dump(self.weather_model, f"{path_prefix}_weather.pkl")
        joblib.dump(self.traffic_model, f"{path_prefix}_traffic.pkl")
        joblib.dump(self.incident_model, f"{path_prefix}_incident.pkl")
        joblib.dump(self.label_encoder, f"{path_prefix}_label_encoder.pkl")

        self.fusion_model.save(f"{path_prefix}_fusion.h5")

    def load_models(self, path_prefix: str):
        self.weather_model = joblib.load(f"{path_prefix}_weather.pkl")
        self.traffic_model = joblib.load(f"{path_prefix}_traffic.pkl")
        self.incident_model = joblib.load(f"{path_prefix}_incident.pkl")
        self.label_encoder = joblib.load(f"{path_prefix}_label_encoder.pkl")

        self._build_fusion_model(input_dim=5, num_classes=len(self.label_encoder.classes_))
        self.fusion_model = keras.models.load_model(f"{path_prefix}_fusion.h5")
