from flask import Flask
from inference.component1 import component1_bp
from inference.component3 import component3_bp

def create_app():
    app = Flask(__name__)

    # Register Blueprints
    app.register_blueprint(component1_bp, url_prefix="/api/itinerary")
    app.register_blueprint(component3_bp, url_prefix="/api/risk")

    @app.route("/")
    def index():
        return {"message": "CeylonMate ML Backend is running"}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5005, debug=True)
