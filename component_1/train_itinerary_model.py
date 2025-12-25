import os
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc

from itinerary_model import ItineraryModel


ROOT = os.path.join("..")
DATA_DIR = os.path.join(ROOT, "datasets")
MODELS_DIR = os.path.join(ROOT, "models", "component1")
METRICS_DIR = os.path.join(MODELS_DIR, "metrics")

ITINERARY_PATH = os.path.join(DATA_DIR, "itinerary_training_data_v2.csv")
ATTRACTIONS_PATH = os.path.join(DATA_DIR, "tourist_attractions.csv")


def plot_time_budget_scatter(model: ItineraryModel):
    if model.last_time_eval is None or model.last_budget_eval is None:
        return

    os.makedirs(METRICS_DIR, exist_ok=True)

    # Time scatter
    y_t = model.last_time_eval["y_true"]
    y_p = model.last_time_eval["y_pred"]

    plt.figure(figsize=(6, 6))
    plt.scatter(y_t, y_p, alpha=0.5)
    min_val = min(y_t.min(), y_p.min())
    max_val = max(y_t.max(), y_p.max())
    plt.plot([min_val, max_val], [min_val, max_val])
    plt.xlabel("Actual total time (hours)")
    plt.ylabel("Predicted total time (hours)")
    plt.title("Time Prediction: Actual vs Predicted")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(METRICS_DIR, "time_actual_vs_predicted.png"), dpi=300)
    plt.close()

    # Budget scatter
    y_t = model.last_budget_eval["y_true"]
    y_p = model.last_budget_eval["y_pred"]

    plt.figure(figsize=(6, 6))
    plt.scatter(y_t, y_p, alpha=0.5)
    min_val = min(y_t.min(), y_p.min())
    max_val = max(y_t.max(), y_p.max())
    plt.plot([min_val, max_val], [min_val, max_val])
    plt.xlabel("Actual total budget (LKR)")
    plt.ylabel("Predicted total budget (LKR)")
    plt.title("Budget Prediction: Actual vs Predicted")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(METRICS_DIR, "budget_actual_vs_predicted.png"), dpi=300)
    plt.close()


def plot_attraction_roc(model: ItineraryModel):
    if model.last_attraction_eval is None or model.last_fusion_eval is None:
        return

    y_val = model.last_attraction_eval["y_val"]
    y_base = model.last_attraction_eval["y_val_proba_base"]
    y_fusion_proba = model.last_fusion_eval["y_val_proba_fusion"]

    fpr_base, tpr_base, _ = roc_curve(y_val, y_base)
    fpr_fusion, tpr_fusion, _ = roc_curve(y_val, y_fusion_proba)

    auc_base = auc(fpr_base, tpr_base)
    auc_fusion = auc(fpr_fusion, tpr_fusion)

    plt.figure(figsize=(7, 6))
    plt.plot(fpr_base, tpr_base, label=f"Base XGBoost (AUC = {auc_base:.3f})")
    plt.plot(fpr_fusion, tpr_fusion, label=f"Fusion NN (AUC = {auc_fusion:.3f})")
    plt.plot([0, 1], [0, 1], "k--", alpha=0.5)
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Attraction Ranking ROC Curves (Negative Sampling)")
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(METRICS_DIR, "attraction_roc_curves.png"), dpi=300)
    plt.close()


def plot_fusion_training_curves(model: ItineraryModel):
    if model.last_fusion_eval is None:
        return
    history = model.last_fusion_eval["history"]

    plt.figure(figsize=(12, 4))

    # Loss
    plt.subplot(1, 3, 1)
    plt.plot(history["loss"], label="Train")
    plt.plot(history["val_loss"], label="Val")
    plt.title("Fusion Model Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Binary crossentropy")
    plt.legend()
    plt.grid(True, alpha=0.3)

    # Accuracy
    if "accuracy" in history:
        plt.subplot(1, 3, 2)
        plt.plot(history["accuracy"], label="Train")
        plt.plot(history["val_accuracy"], label="Val")
        plt.title("Fusion Model Accuracy")
        plt.xlabel("Epoch")
        plt.ylabel("Accuracy")
        plt.legend()
        plt.grid(True, alpha=0.3)

    # AUC
    if "auc" in history:
        plt.subplot(1, 3, 3)
        plt.plot(history["auc"], label="Train")
        plt.plot(history["val_auc"], label="Val")
        plt.title("Fusion Model AUC")
        plt.xlabel("Epoch")
        plt.ylabel("AUC")
        plt.legend()
        plt.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(METRICS_DIR, "fusion_training_curves.png"), dpi=300)
    plt.close()


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(METRICS_DIR, exist_ok=True)

    print("Loading datasets...")
    it_df = pd.read_csv(ITINERARY_PATH)
    att_df = pd.read_csv(ATTRACTIONS_PATH)
    print(f"  Itineraries: {len(it_df)}")
    print(f"  Attractions: {len(att_df)}")

    model = ItineraryModel()

    print("\nTraining time & budget models...")
    tb_metrics = model.train_time_budget_models(it_df)
    print("Time/Budget metrics:", tb_metrics)

    print("\nTraining attraction ranking + fusion model with negative sampling...")
    att_metrics = model.train_attraction_model(it_df, att_df, negative_per_positive=5)
    print("Attraction metrics:", att_metrics)

    print("\nSaving models...")
    model.save(MODELS_DIR)
    print("Models saved to:", MODELS_DIR)

    metrics_path = os.path.join(METRICS_DIR, "training_metrics.txt")
    print("Writing metrics to:", metrics_path)

    with open(metrics_path, "w") as f:
        f.write("=" * 70 + "\n")
        f.write("COMPONENT 1: ITINERARY GENERATOR - STACKING ENSEMBLE METRICS\n")
        f.write("=" * 70 + "\n\n")

        f.write("Time & Budget Models (XGBoost Regressors):\n")
        f.write("-" * 70 + "\n")
        f.write(f"Time MAE (hours).........................{tb_metrics['time_mae']:.4f}\n")
        f.write(f"Time R^2.................................{tb_metrics['time_r2']:.4f}\n")
        f.write(f"Budget MAE (LKR).........................{tb_metrics['budget_mae']:.4f}\n")
        f.write(f"Budget R^2...............................{tb_metrics['budget_r2']:.4f}\n\n")

        f.write("Attraction Ranking Model (XGBoost + Fusion NN, Negative Sampling):\n")
        f.write("-" * 70 + "\n")
        f.write(f"Base XGBoost AUC.........................{att_metrics['attraction_auc_base']:.4f}\n")
        f.write(f"Fusion NN AUC............................{att_metrics['attraction_auc_fusion']:.4f}\n")
        f.write(f"Positive sample rate.....................{att_metrics['positive_rate']:.4f}\n\n")

        f.write("=" * 70 + "\n")
        f.write("TRAINING SUMMARY\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Itinerary samples: {len(it_df)}\n")
        f.write(f"Attractions: {len(att_df)}\n")

    print("Metrics written.")

    print("\nGenerating graphs...")
    plot_time_budget_scatter(model)
    plot_attraction_roc(model)
    plot_fusion_training_curves(model)

    print("Graphs saved in:", METRICS_DIR)
    print("\nTraining completed successfully.")


if __name__ == "__main__":
    main()
