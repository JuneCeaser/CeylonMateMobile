from flask import Flask, request
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os

from recommender.content_based import recommend_by_text

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB Atlas connection
MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)

# select database
db = client["CeylonMate"]

print("✅ Connected to MongoDB Atlas")


@app.route("/health", methods=["GET"])
def health():
    return {"status": "Recommender server running"}, 200


@app.route("/test-db", methods=["GET"])
def test_db():
    collections = db.list_collection_names()
    return {"collections": collections}


@app.route("/test-experiences", methods=["GET"])
def test_experiences():
    experiences = list(
        db["experiences"].find({}, {"title": 1, "category": 1, "description": 1}).limit(5)
    )

    for exp in experiences:
        exp["_id"] = str(exp["_id"])

    return {"count": len(experiences), "experiences": experiences}


@app.route("/recommend-test", methods=["GET"])
def recommend_test():
    interests = ["food", "traditional cooking", "local culture"]

    results = recommend_by_text(db, interests)

    return {
        "interests": interests,
        "recommendations": results
    }

@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json()

    interests = data.get("interests", [])

    results = recommend_by_text(db, interests)

    return {
        "interests": interests,
        "recommendations": results
    }

if __name__ == "__main__":
    app.run(port=5002, debug=True, use_reloader=False)