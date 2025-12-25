import os
import pandas as pd
import matplotlib.pyplot as plt

from risk_model import RiskStackingModel, add_time_features


DATA_PATH = os.path.join("..", "datasets", "realtime_conditions_training.csv")
MODELS_DIR = os.path.join("..", "models", "component3")
METRICS_DIR = os.path.join(MODELS_DIR, "metrics")
MODEL_PREFIX = os.path.join(MODELS_DIR, "risk_model")


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(METRICS_DIR, exist_ok=True)

    print("Loading dataset:", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
    print(f"Total records: {len(df)}")

    df = add_time_features(df)

    model = RiskStackingModel()
    print("Training stacking ensemble model...")
    history, base_metrics = model.train(df)

    print("\nSaving models...")
    model.save_models(MODEL_PREFIX)
    print("Models saved to:", MODEL_PREFIX)

    metrics_path = os.path.join(METRICS_DIR, "training_metrics.txt")
    print("Writing metrics to:", metrics_path)

    with open(metrics_path, "w") as f:
        f.write("=" * 70 + "\n")
        f.write("COMPONENT 3: RISK ZONE PREDICTION - STACKING MODEL METRICS\n")
        f.write("=" * 70 + "\n\n")

        f.write("Base Learner Models:\n")
        f.write("-" * 70 + "\n")
        f.write("1. Weather Model: XGBoost Regressor\n")
        f.write("2. Traffic Model: Random Forest Regressor\n")
        f.write("3. Incident Model: XGBoost Regressor\n\n")

        f.write("Fusion Model (Neural Network):\n")
        f.write("-" * 70 + "\n")
        f.write("Input: [weather_risk, traffic_risk, incident_risk, hour_norm, day_norm]\n")
        f.write("Dense(16) -> Dense(8) -> multi-task outputs:\n")
        f.write("  - risk_score (regression)\n")
        f.write("  - risk_category (classification)\n")
        f.write("  - severity_level (regression)\n\n")

        f.write("=" * 70 + "\n")
        f.write("BASE LEARNER PERFORMANCE (VALIDATION)\n")
        f.write("=" * 70 + "\n\n")
        for k, v in base_metrics.items():
            f.write(f"{k:.<40} {v:.4f}\n")

        f.write("\n" + "=" * 70 + "\n")
        f.write("FUSION MODEL PERFORMANCE (FINAL EPOCH)\n")
        f.write("=" * 70 + "\n\n")

        f.write(f"Final training loss.....................{history.history['loss'][-1]:.4f}\n")
        f.write(f"Final validation loss...................{history.history['val_loss'][-1]:.4f}\n")
        f.write(
            f"Risk score MAE (train)................."
            f"{history.history['risk_score_mae'][-1]:.4f}\n"
        )
        f.write(
            f"Risk score MAE (val)..................."
            f"{history.history['val_risk_score_mae'][-1]:.4f}\n"
        )
        f.write(
            f"Severity MAE (train)..................."
            f"{history.history['severity_level_mae'][-1]:.4f}\n"
        )
        f.write(
            f"Severity MAE (val)....................."
            f"{history.history['val_severity_level_mae'][-1]:.4f}\n"
        )
        f.write(
            f"Risk category accuracy (train)........."
            f"{history.history['risk_category_accuracy'][-1]:.4f}\n"
        )
        f.write(
            f"Risk category accuracy (val)..........."
            f"{history.history['val_risk_category_accuracy'][-1]:.4f}\n"
        )

        f.write("\n" + "=" * 70 + "\n")
        f.write("TRAINING SUMMARY\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Total epochs trained: {len(history.history['loss'])}\n")
        f.write("Batch size: 32\n")
        f.write("Optimizer: Adam (lr=0.001)\n")
        f.write("Validation split: 20%\n")

    print("Metrics written.")

    curves_path = os.path.join(METRICS_DIR, "training_curves.png")
    print("Saving training curves to:", curves_path)

    plt.figure(figsize=(12, 6))
    plt.subplot(1, 2, 1)
    plt.plot(history.history["loss"], label="Train")
    plt.plot(history.history["val_loss"], label="Validation")
    plt.title("Overall Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    plt.plot(history.history["risk_category_accuracy"], label="Train Accuracy")
    plt.plot(history.history["val_risk_category_accuracy"], label="Val Accuracy")
    plt.title("Risk Category Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(curves_path, dpi=300, bbox_inches="tight")
    plt.close()

    print("Training completed successfully.")


if __name__ == "__main__":
    main()
