from datetime import datetime, timezone
from time import perf_counter

from flask import Flask, jsonify
from flask_cors import CORS
from pymongo.errors import PyMongoError

from db import client
from routes import alerts_bp, analytics_bp, distribution_bp, metrics_bp, predictions_bp, summary_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(summary_bp)
app.register_blueprint(metrics_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(predictions_bp)
app.register_blueprint(distribution_bp)


@app.route("/api/health", methods=["GET"])
def health():
    started_at = perf_counter()
    checked_at = datetime.now(timezone.utc).isoformat()
    mongodb_started = perf_counter()

    try:
        client.admin.command("ping", maxTimeMS=1500)
        mongodb_status = "online"
        mongodb_error = None
    except PyMongoError as error:
        # Keep connection strings and driver details out of the public response.
        app.logger.warning("MongoDB health check failed (%s)", type(error).__name__)
        mongodb_status = "offline"
        mongodb_error = "MongoDB ping failed."

    mongodb_latency_ms = round((perf_counter() - mongodb_started) * 1000, 2)
    status = "online" if mongodb_status == "online" else "degraded"
    payload = {
        "status": status,
        "checked_at": checked_at,
        "services": {
            "flask": {
                "status": "online",
                "required": True,
                "response_time_ms": round((perf_counter() - started_at) * 1000, 2),
            },
            "mongodb": {
                "status": mongodb_status,
                "required": True,
                "response_time_ms": mongodb_latency_ms,
                "error": mongodb_error,
            },
            "pyspark": {
                "status": "unknown",
                "required": False,
                "message": "No lightweight PySpark readiness check is configured.",
            },
            "ml_model": {
                "status": "unknown",
                "required": False,
                "message": "No model readiness or prediction check is configured.",
            },
        },
    }
    return jsonify(payload), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
