import os
import sys
from flask import Blueprint, request, jsonify

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.append(BASE_DIR)

component1_bp = Blueprint("component1", __name__)

from .predict_itinerary import run_itinerary_inference

@component1_bp.route("/recommend", methods=["POST"])
def recommend_itinerary():
    try:
        payload = request.json or {}
        result = run_itinerary_inference(payload)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "error": "Itinerary inference failed",
            "details": str(e)
        }), 500

